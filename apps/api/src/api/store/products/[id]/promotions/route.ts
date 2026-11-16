import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import {
  loadActiveProductPromotions,
  loadUpcomingProductPromotions,
  matchProductPromotionIds,
  pickCampaignWindow,
  PromotionMatchableProduct,
  promotionsInSellerScope,
} from "../../../../../lib/search/promotion-index"
import { loadPromotionDetails, presentProductPromotions } from "../../../../../lib/search/promotion-details"
import { loadReferencePrices, ReferencePriceEntry } from "../../../../../lib/reference-price"
import { resolveRegionByCountryCode } from "../../../../../lib/resolve-region"
import { parseRows } from "../../../../../lib/graph-schemas"
import { VARIANT_PRICE_HISTORY_MODULE } from "../../../../../modules/variant-price-history"
import VariantPriceHistoryService from "../../../../../modules/variant-price-history/service"

const STORE_COUNTRY_CODE = "tr"

const ProductMatchRowSchema = z.object({
  id: z.string(),
  categories: z.array(z.object({ id: z.string() })).nullable().default([]),
  collection_id: z.string().nullable().optional(),
  type_id: z.string().nullable().optional(),
  tags: z.array(z.object({ id: z.string() })).nullable().default([]),
  variants: z.array(z.object({ id: z.string() })).nullable().default([]),
  sellers: z.array(z.object({ id: z.string() })).nullable().default([]),
  discountable: z.boolean().default(true),
})

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: productRows } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "categories.id",
      "collection_id",
      "type_id",
      "tags.id",
      "variants.id",
      "sellers.id",
      "discountable",
    ],
    filters: { id },
  })

  const product = parseRows(ProductMatchRowSchema, productRows)[0]
  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${id} was not found`
    )
  }

  const variantIds = (product.variants ?? []).map((variant) => variant.id)

  const matchableProduct: PromotionMatchableProduct = {
    id: product.id,
    category_ids: (product.categories ?? []).map((category) => category.id),
    collection_id: product.collection_id ?? null,
    type_id: product.type_id ?? null,
    tag_ids: (product.tags ?? []).map((tag) => tag.id),
  }

  const sellerId = (product.sellers ?? [])[0]?.id
  const [activePromotions, upcomingPromotions] = await Promise.all([
    loadActiveProductPromotions(req.scope).then((promotions) =>
      promotionsInSellerScope(promotions, sellerId)
    ),
    loadUpcomingProductPromotions(req.scope).then((promotions) =>
      promotionsInSellerScope(promotions, sellerId)
    ),
  ])
  const matchedIds = matchProductPromotionIds(matchableProduct, activePromotions)
  const sellerIdByPromotionId = new Map(
    activePromotions.map((promotion) => [promotion.promotionId, promotion.sellerId] as const)
  )

  const [loadedPromotions, region] = await Promise.all([
    loadPromotionDetails(query, matchedIds, sellerIdByPromotionId),
    resolveRegionByCountryCode(query, STORE_COUNTRY_CODE),
  ])
  const promotions = presentProductPromotions(loadedPromotions, {
    currency_code: region?.currency_code ?? null,
    product_discountable: product.discountable,
    now: Date.now(),
  })

  const referencePriceByVariantId: Record<string, ReferencePriceEntry> = {}

  if (region) {
    const variantPriceHistoryService = req.scope.resolve<VariantPriceHistoryService>(
      VARIANT_PRICE_HISTORY_MODULE
    )
    const referencePrices = await loadReferencePrices(
      variantPriceHistoryService,
      variantIds,
      region.currency_code
    )
    for (const [variantId, entry] of referencePrices) {
      referencePriceByVariantId[variantId] = entry
    }
  }

  res.json({
    promotions,
    reference_prices: referencePriceByVariantId,
    campaign_windows: {
      active: pickCampaignWindow(matchableProduct, activePromotions, "active"),
      upcoming: pickCampaignWindow(matchableProduct, upcomingPromotions, "upcoming"),
    },
  })
}
