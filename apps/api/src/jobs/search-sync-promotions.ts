import type { Query } from '@medusajs/framework'
import { ICacheService, MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  IndexedProductPromotion,
  loadActiveProductPromotions,
  loadUpcomingProductPromotions,
  matchCampaignIds,
  matchProductPromotions,
  PromotionMatchableProduct,
  ProductPromotionKind,
  promotionsInSellerScope,
} from '../lib/search/promotion-index'
import { getProductIdsForSeller, reindexProductsById } from '../lib/search/sync'
import { presentItems } from "../lib/graph-list"

// Medusa's promotion/campaign workflows (create/update/delete, in this
// framework version) never emit a domain event — same situation as
// inventory levels (see search-sync-stock-changed.ts). A campaign also
// starts/ends purely by its `starts_at`/`ends_at` dates passing, which no
// event could fire for even if one existed. A scheduled reconciliation job
// is therefore the only way to keep `promotion_types`/`campaign_ids`/
// `upcoming_campaign_ids` correct.
//
// Cost is bounded by the catalog of sellers who currently have (or, last
// run, had) an active or upcoming product-targeting promotion. A platform
// promotion (no seller) can discount every seller's products, so while one
// is active or upcoming every seller is scanned.
const JOB_NAME = 'search-sync-promotions'
const CRON_SCHEDULE = '*/5 * * * *'
const SNAPSHOT_CACHE_KEY = 'search:promotion-coverage-snapshot:v2'
const SNAPSHOT_TTL_SECONDS = 900

type ProductCoverage = {
  kinds: ProductPromotionKind[]
  campaigns: string[]
  upcoming: string[]
}
type SellerSnapshot = Record<string, ProductCoverage>
type CoverageSnapshot = Record<string, SellerSnapshot>

const EMPTY_COVERAGE: ProductCoverage = { kinds: [], campaigns: [], upcoming: [] }

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const sortedB = [...b].sort()
  return [...a].sort().every((value, i) => value === sortedB[i])
}

function coverageEqual(a: ProductCoverage | undefined, b: ProductCoverage): boolean {
  if (!a) {
    return false
  }
  return (
    sameMembers(a.kinds, b.kinds) &&
    sameMembers(a.campaigns, b.campaigns) &&
    sameMembers(a.upcoming, b.upcoming)
  )
}

async function computeSellerCoverage(
  container: MedusaContainer,
  sellerId: string,
  activePromotions: IndexedProductPromotion[],
  upcomingPromotions: IndexedProductPromotion[]
): Promise<SellerSnapshot> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const sellerPromotions = promotionsInSellerScope(activePromotions, sellerId)
  const sellerUpcomingPromotions = promotionsInSellerScope(upcomingPromotions, sellerId)
  if (!sellerPromotions.length && !sellerUpcomingPromotions.length) {
    return {}
  }

  const productIds = await getProductIdsForSeller(container, sellerId)
  if (!productIds.length) {
    return {}
  }

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'categories.id', 'collection_id', 'type_id', 'tags.id'],
    filters: { id: productIds, status: 'published' },
  })

  const snapshot: SellerSnapshot = {}
  for (const product of products) {
    const matchable: PromotionMatchableProduct = {
      id: product.id,
      category_ids: presentItems(product.categories).map((c) => c.id),
      collection_id: product.collection_id ?? null,
      type_id: product.type_id ?? null,
      tag_ids: (product.tags ?? []).map((t) => t.id),
    }
    const { promotion_types, campaign_ids } = matchProductPromotions(
      matchable,
      sellerPromotions
    )
    const upcoming = matchCampaignIds(matchable, sellerUpcomingPromotions)
    if (promotion_types.length || upcoming.length) {
      snapshot[product.id] = { kinds: promotion_types, campaigns: campaign_ids, upcoming }
    }
  }

  return snapshot
}

async function listSellerIds(container: MedusaContainer): Promise<string[]> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: sellers } = await query.graph({ entity: 'seller', fields: ['id'] })
  return sellers.map((seller: { id: string }) => seller.id)
}

export default async function searchSyncPromotionsJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cache = container.resolve<ICacheService>(Modules.CACHE)

  try {
    const [activePromotions, upcomingPromotions] = await Promise.all([
      loadActiveProductPromotions(container),
      loadUpcomingProductPromotions(container),
    ])
    const previousSnapshot =
      (await cache.get<CoverageSnapshot>(SNAPSHOT_CACHE_KEY)) ?? {}

    const promotions = [...activePromotions, ...upcomingPromotions]
    const activeSellerIds = new Set(
      promotions.some((p) => p.sellerId === null)
        ? await listSellerIds(container)
        : promotions.map((p) => p.sellerId).filter((id): id is string => id !== null)
    )
    // Sellers scanned last run must be re-scanned even with zero currently
    // active promotions — that's exactly the "last promotion just ended"
    // case, and the only way to clear their stale coverage.
    const sellerIdsToScan = new Set([
      ...activeSellerIds,
      ...Object.keys(previousSnapshot),
    ])

    if (!sellerIdsToScan.size) {
      return
    }

    const nextSnapshot: CoverageSnapshot = {}
    const changedProductIds = new Set<string>()

    for (const sellerId of sellerIdsToScan) {
      const sellerSnapshot = await computeSellerCoverage(
        container,
        sellerId,
        activePromotions,
        upcomingPromotions
      )
      if (Object.keys(sellerSnapshot).length) {
        nextSnapshot[sellerId] = sellerSnapshot
      }

      const previousSellerSnapshot = previousSnapshot[sellerId] ?? {}
      const productIds = new Set([
        ...Object.keys(sellerSnapshot),
        ...Object.keys(previousSellerSnapshot),
      ])
      for (const productId of productIds) {
        if (!coverageEqual(previousSellerSnapshot[productId], sellerSnapshot[productId] ?? EMPTY_COVERAGE)) {
          changedProductIds.add(productId)
        }
      }
    }

    if (changedProductIds.size) {
      await reindexProductsById(container, [...changedProductIds])
    }

    await cache.set(SNAPSHOT_CACHE_KEY, nextSnapshot, SNAPSHOT_TTL_SECONDS)
  } catch (error) {
    logger.error(
      `[${JOB_NAME}] failed to sync promotion coverage to the search index:`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export const config = {
  name: JOB_NAME,
  schedule: CRON_SCHEDULE,
}
