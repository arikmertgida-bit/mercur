import type { Query } from '@medusajs/framework'
import type { MedusaContainer } from '@medusajs/framework/types'

import type { HydratedCatalogProduct } from './catalog-hydration'
import type { ResolvedRegion } from './resolve-region'
import { loadReferencePrices, ReferencePriceEntry } from './reference-price'
import {
  CampaignWindow,
  earliestDiscountStart,
  loadActiveProductPromotions,
  loadCartWidePromotions,
  matchBuyRulePromotionIds,
  loadUpcomingProductPromotions,
  matchProductPromotionIds,
  pickCampaignWindow,
  PromotionMatchableProduct,
  promotionsInSellerScope,
} from './search/promotion-index'
import {
  LoadedPromotion,
  loadPromotionDetails,
  presentProductPromotions,
  PromotionDetail,
} from './search/promotion-details'
import { VARIANT_PRICE_HISTORY_MODULE } from '../modules/variant-price-history'
import VariantPriceHistoryService from '../modules/variant-price-history/service'

export type ProductCampaignWindows = {
  active: CampaignWindow | null
  upcoming: CampaignWindow | null
}

export type CatalogPromotionPricing = {
  // Mirrors the per-product `/store/products/:id/promotions` route's
  // `promotions[0] ?? null` pick — one badge-worthy promotion per product,
  // the one the cart applies first, carrying the product's `cart_discount`.
  promotionsByProductId: Record<string, PromotionDetail | null>
  // Keyed by variant id (Ticaret Bakanlığı 10-günlük referans fiyat kuralı).
  referencePrices: Record<string, ReferencePriceEntry>
  // Only products covered by at least one campaign appear here — the
  // storefront campaign pages count each card down to these dates.
  campaignWindows: Record<string, ProductCampaignWindows>
}

const EMPTY_RESULT: CatalogPromotionPricing = {
  promotionsByProductId: {},
  referencePrices: {},
  campaignWindows: {},
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

  const [activePromotions, upcomingPromotions, cartWidePromotions] = await Promise.all([
    loadActiveProductPromotions(container),
    loadUpcomingProductPromotions(container),
    loadCartWidePromotions(container),
  ])
  const sellerIdByPromotionId = new Map(
    [...activePromotions, ...cartWidePromotions].map(
      (promotion) => [promotion.promotionId, promotion.sellerId] as const
    )
  )

  const matchedIdsByProductId = new Map<string, string[]>()
  const buyRuleMatchesByProductId = new Map<string, Set<string>>()
  const cartWideIdsByProductId = new Map<string, string[]>()
  const allMatchedIds = new Set<string>()
  const campaignWindows: Record<string, ProductCampaignWindows> = {}
  for (const product of products) {
    const matchableProduct: PromotionMatchableProduct = {
      id: product.id,
      category_ids: (product.categories ?? []).map((category) => category.id),
      collection_id: product.collection?.id ?? null,
      type_id: product.type_id ?? null,
      tag_ids: (product.tags ?? []).map((tag) => tag.id),
    }
    const scopedActive = promotionsInSellerScope(activePromotions, product.seller?.id)
    const matchedIds = matchProductPromotionIds(matchableProduct, scopedActive)
    matchedIdsByProductId.set(product.id, matchedIds)
    buyRuleMatchesByProductId.set(product.id, matchBuyRulePromotionIds(matchableProduct, scopedActive))
    const cartWideIds = promotionsInSellerScope(cartWidePromotions, product.seller?.id).map(
      (promotion) => promotion.promotionId
    )
    cartWideIdsByProductId.set(product.id, cartWideIds)
    const active = pickCampaignWindow(matchableProduct, scopedActive, 'active')
    const upcoming = pickCampaignWindow(
      matchableProduct,
      promotionsInSellerScope(upcomingPromotions, product.seller?.id),
      'upcoming'
    )
    if (active || upcoming) {
      campaignWindows[product.id] = { active, upcoming }
    }
    for (const id of [...matchedIds, ...cartWideIds]) {
      allMatchedIds.add(id)
    }
  }

  const loadedPromotions = await loadPromotionDetails(
    query,
    [...allMatchedIds],
    sellerIdByPromotionId
  )
  const promotionById = new Map(
    loadedPromotions.map((promotion) => [promotion.detail.id, promotion] as const)
  )

  const now = Date.now()
  const promotionsByProductId: Record<string, PromotionDetail | null> = {}
  for (const product of products) {
    const loaded = (ids: string[] | undefined): LoadedPromotion[] =>
      (ids ?? [])
        .map((id) => promotionById.get(id))
        .filter((promotion): promotion is LoadedPromotion => promotion !== undefined)
    const presented = presentProductPromotions(
      loaded(matchedIdsByProductId.get(product.id)),
      loaded(cartWideIdsByProductId.get(product.id)),
      {
        currency_code: region?.currency_code ?? null,
        product_discountable: product.discountable,
        now,
        buy_rule_matches: buyRuleMatchesByProductId.get(product.id) ?? new Set(),
      }
    )
    promotionsByProductId[product.id] = presented[0] ?? null
  }

  const referencePrices: Record<string, ReferencePriceEntry> = {}
  if (region) {
    const variantIds: string[] = []
    const discountStartByVariantId = new Map<string, string>()
    for (const product of products) {
      const discountStartsAt = earliestDiscountStart(
        matchedIdsByProductId.get(product.id) ?? [],
        activePromotions
      )
      for (const variant of product.variants ?? []) {
        variantIds.push(variant.id)
        if (discountStartsAt) {
          discountStartByVariantId.set(variant.id, discountStartsAt)
        }
      }
    }
    const variantPriceHistoryService = container.resolve<VariantPriceHistoryService>(
      VARIANT_PRICE_HISTORY_MODULE
    )
    const entries = await loadReferencePrices(
      variantPriceHistoryService,
      variantIds,
      region.currency_code,
      discountStartByVariantId
    )
    for (const [variantId, entry] of entries) {
      referencePrices[variantId] = entry
    }
  }

  return { promotionsByProductId, referencePrices, campaignWindows }
}
