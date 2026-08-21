import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import {
  loadActiveProductPromotions,
  matchProductPromotionIds,
  PromotionMatchableProduct,
} from "../../../../../lib/search/promotion-index"
import { loadPromotionDetails } from "../../../../../lib/search/promotion-details"
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
    ],
    filters: { id },
  })

  const product = parseRows(ProductMatchRowSchema, productRows as object[])[0]
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const variantIds = (product.variants ?? []).map((variant) => variant.id)

  const matchableProduct: PromotionMatchableProduct = {
    id: product.id,
    category_ids: (product.categories ?? []).map((category) => category.id),
    collection_id: product.collection_id ?? null,
    type_id: product.type_id ?? null,
    tag_ids: (product.tags ?? []).map((tag) => tag.id),
  }

  const activePromotions = await loadActiveProductPromotions(req.scope)
  const matchedIds = matchProductPromotionIds(matchableProduct, activePromotions)
  const sellerIdByPromotionId = new Map(
    activePromotions.map((promotion) => [promotion.promotionId, promotion.sellerId] as const)
  )

  const promotions = await loadPromotionDetails(query, matchedIds, sellerIdByPromotionId)

  const region = await resolveRegionByCountryCode(query, STORE_COUNTRY_CODE)
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
  })
}
