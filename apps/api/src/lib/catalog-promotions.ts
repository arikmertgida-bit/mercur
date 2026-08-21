import type { Query } from '@medusajs/framework'
import type { MedusaContainer } from '@medusajs/framework/types'

import type { HydratedCatalogProduct } from './catalog-hydration'
import type { ResolvedRegion } from './resolve-region'
import { loadReferencePrices, ReferencePriceEntry } from './reference-price'
import {
  loadActiveProductPromotions,
  matchProductPromotionIds,
  PromotionMatchableProduct,
} from './search/promotion-index'
import { loadPromotionDetails, PromotionDetail } from './search/promotion-details'
import { VARIANT_PRICE_HISTORY_MODULE } from '../modules/variant-price-history'
import VariantPriceHistoryService from '../modules/variant-price-history/service'

export type CatalogPromotionPricing = {
  // Mirrors the per-product `/store/products/:id/promotions` route's
  // `promotions[0] ?? null` pick — one badge-worthy promotion per product.
  promotionsByProductId: Record<string, PromotionDetail | null>
  // Keyed by variant id (Ticaret Bakanlığı 10-günlük referans fiyat kuralı).
  referencePrices: Record<string, ReferencePriceEntry>
}

const EMPTY_RESULT: CatalogPromotionPricing = {
  promotionsByProductId: {},
  referencePrices: {},
}

// Same promotion-matching + reference-price data the PDP/card already show
// (see the per-product route + `get-product-price.ts`'s `applyReferencePrice`
// on the storefront), computed once for an entire catalog/seller-listing
// page instead of once per product — `loadActiveProductPromotions` and
// `loadPromotionDetails` are each called exactly once regardless of how many
// products are on the page, and `loadReferencePrices` runs a single batched
// lookup across every variant on the page.
export async function loadCatalogPromotionPricing(
  container: MedusaContainer,
  query: Query,
  products: HydratedCatalogProduct[],
  region: ResolvedRegion | null
): Promise<CatalogPromotionPricing> {
  if (products.length === 0) {
    return EMPTY_RESULT
  }

  const activePromotions = await loadActiveProductPromotions(container)
  const sellerIdByPromotionId = new Map(
    activePromotions.map((promotion) => [promotion.promotionId, promotion.sellerId] as const)
  )

  const matchedIdsByProductId = new Map<string, string[]>()
  const allMatchedIds = new Set<string>()
  for (const product of products) {
    const matchableProduct: PromotionMatchableProduct = {
      id: product.id,
      category_ids: (product.categories ?? []).map((category) => category.id),
      collection_id: product.collection?.id ?? null,
      type_id: product.type_id ?? null,
      tag_ids: (product.tags ?? []).map((tag) => tag.id),
    }
    const matchedIds = matchProductPromotionIds(matchableProduct, activePromotions)
    matchedIdsByProductId.set(product.id, matchedIds)
    for (const id of matchedIds) {
      allMatchedIds.add(id)
    }
  }

  const promotionDetails = await loadPromotionDetails(
    query,
    [...allMatchedIds],
    sellerIdByPromotionId
  )
  const promotionById = new Map(promotionDetails.map((promotion) => [promotion.id, promotion] as const))

  const promotionsByProductId: Record<string, PromotionDetail | null> = {}
  for (const product of products) {
    const matchedIds = matchedIdsByProductId.get(product.id) ?? []
    const first = matchedIds
      .map((id) => promotionById.get(id))
      .find((promotion): promotion is PromotionDetail => promotion !== undefined)
    promotionsByProductId[product.id] = first ?? null
  }

  const referencePrices: Record<string, ReferencePriceEntry> = {}
  if (region) {
    const variantIds = products.flatMap((product) => (product.variants ?? []).map((variant) => variant.id))
    const variantPriceHistoryService = container.resolve<VariantPriceHistoryService>(
      VARIANT_PRICE_HISTORY_MODULE
    )
    const entries = await loadReferencePrices(variantPriceHistoryService, variantIds, region.currency_code)
    for (const [variantId, entry] of entries) {
      referencePrices[variantId] = entry
    }
  }

  return { promotionsByProductId, referencePrices }
}
