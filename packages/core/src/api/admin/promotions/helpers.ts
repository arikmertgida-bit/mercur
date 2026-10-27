import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"
import { QueryFilter } from "../../../utils/query-filter"

const PLATFORM_OWNER = "platform"

type PromotionFilterFields = QueryFilter & {
  seller_id?: string | string[]
}

const PromotionIdRowSchema = z.object({ promotion_id: z.string() })

export const applyPromotionSellerFilter = async (
  req: AuthenticatedMedusaRequest<never, PromotionFilterFields>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const filterableFields = req.filterableFields ?? {}
  const sellerId = filterableFields.seller_id

  if (!sellerId) {
    return next()
  }

  delete filterableFields.seller_id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const wantsPlatform =
    sellerId === PLATFORM_OWNER ||
    (Array.isArray(sellerId) && sellerId.includes(PLATFORM_OWNER))

  if (wantsPlatform) {
    const { data: links } = await query.graph({
      entity: "promotion_seller",
      fields: ["promotion_id"],
    })
    const ownedIds = parseGraphRows(PromotionIdRowSchema, links).map(
      (l) => l.promotion_id
    )

    filterableFields.id = ownedIds.length ? { $nin: ownedIds } : undefined
    return next()
  }

  const { data: links } = await query.graph({
    entity: "promotion_seller",
    fields: ["promotion_id"],
    filters: { seller_id: sellerId },
  })
  const promotionIds = parseGraphRows(PromotionIdRowSchema, links).map(
    (l) => l.promotion_id
  )

  filterableFields.id = promotionIds.length ? promotionIds : ["__no_match__"]
  return next()
}
