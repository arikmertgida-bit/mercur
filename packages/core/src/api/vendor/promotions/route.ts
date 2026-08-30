import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { createSellerPromotionsWorkflow } from "../../../workflows/promotion"
import { verifyCodeReservationToken } from "../../../workflows/promotion/utils"
import { refetchPromotion } from "./helpers"
import {
  VendorCreatePromotionType,
  VendorGetPromotionsParamsType,
} from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetPromotionsParamsType>,
  res: MedusaResponse<HttpTypes.VendorPromotionListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: promotions, metadata } = await query.graph({
    entity: "promotion",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    promotions,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreatePromotionType>,
  res: MedusaResponse<HttpTypes.VendorPromotionResponse>
) => {
  const sellerId = req.seller_context!.seller_id
  const { code_reservation_token, ...promotionData } = req.validatedBody

  const preferredCode = code_reservation_token
    ? verifyCodeReservationToken(req.scope, code_reservation_token, sellerId)
    : null

  const { result } = await createSellerPromotionsWorkflow(req.scope).run({
    input: {
      seller_id: sellerId,
      promotions: [promotionData],
      preferredCode,
    },
  })

  const promotion = await refetchPromotion(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.json({ promotion })
}
