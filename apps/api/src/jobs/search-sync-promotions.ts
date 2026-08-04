import type { Query } from '@medusajs/framework'
import { ICacheService, MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  ActiveProductPromotion,
  loadActiveProductPromotions,
  matchProductPromotions,
  PromotionMatchableProduct,
  ProductPromotionKind,
} from '../lib/search/promotion-index'
import { getProductIdsForSeller, reindexProductsById } from '../lib/search/sync'

// Medusa's promotion/campaign workflows (create/update/delete, in this
// framework version) never emit a domain event — same situation as
// inventory levels (see search-sync-stock-changed.ts). A campaign also
// starts/ends purely by its `starts_at`/`ends_at` dates passing, which no
// event could fire for even if one existed. A scheduled reconciliation job
// is therefore the only way to keep `promotion_types`/`campaign_ids` correct.
//
// Cost is bounded by the catalog of sellers who currently have (or, last
// run, had) an active product-targeting promotion — never by the total
// marketplace catalog — so this stays cheap at 10k+ seller / 1M+ product
// scale even though it re-scans in full each run.
const JOB_NAME = 'search-sync-promotions'
const CRON_SCHEDULE = '*/5 * * * *'
const SNAPSHOT_CACHE_KEY = 'search:promotion-coverage-snapshot'
const SNAPSHOT_TTL_SECONDS = 900

type ProductCoverage = { kinds: ProductPromotionKind[]; campaigns: string[] }
type SellerSnapshot = Record<string, ProductCoverage>
type CoverageSnapshot = Record<string, SellerSnapshot>

type ProductRow = {
  id: string
  categories?: { id: string }[] | null
  collection_id?: string | null
  type_id?: string | null
  tags?: { id: string }[] | null
}

function coverageEqual(a: ProductCoverage | undefined, b: ProductCoverage): boolean {
  if (!a) {
    return false
  }
  if (a.kinds.length !== b.kinds.length || a.campaigns.length !== b.campaigns.length) {
    return false
  }
  const aKinds = [...a.kinds].sort()
  const bKinds = [...b.kinds].sort()
  const aCampaigns = [...a.campaigns].sort()
  const bCampaigns = [...b.campaigns].sort()
  return (
    aKinds.every((kind, i) => kind === bKinds[i]) &&
    aCampaigns.every((id, i) => id === bCampaigns[i])
  )
}

async function computeSellerCoverage(
  container: MedusaContainer,
  sellerId: string,
  activePromotions: ActiveProductPromotion[]
): Promise<SellerSnapshot> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const sellerPromotions = activePromotions.filter((p) => p.sellerId === sellerId)
  if (!sellerPromotions.length) {
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
  for (const product of products as ProductRow[]) {
    const matchable: PromotionMatchableProduct = {
      id: product.id,
      category_ids: (product.categories ?? []).map((c) => c.id),
      collection_id: product.collection_id ?? null,
      type_id: product.type_id ?? null,
      tag_ids: (product.tags ?? []).map((t) => t.id),
    }
    const { promotion_types, campaign_ids } = matchProductPromotions(
      matchable,
      sellerPromotions
    )
    if (promotion_types.length) {
      snapshot[product.id] = { kinds: promotion_types, campaigns: campaign_ids }
    }
  }

  return snapshot
}

export default async function searchSyncPromotionsJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cache = container.resolve<ICacheService>(Modules.CACHE)

  try {
    const activePromotions = await loadActiveProductPromotions(container)
    const previousSnapshot =
      (await cache.get<CoverageSnapshot>(SNAPSHOT_CACHE_KEY)) ?? {}

    const activeSellerIds = new Set(
      activePromotions.map((p) => p.sellerId).filter((id): id is string => id !== null)
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
        activePromotions
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
        if (!coverageEqual(previousSellerSnapshot[productId], sellerSnapshot[productId] ?? { kinds: [], campaigns: [] })) {
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
