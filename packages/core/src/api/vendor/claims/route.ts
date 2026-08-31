import { beginClaimOrderWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  VendorGetClaimsParamsType,
  VendorPostOrderClaimsReqType,
} from "./validators"
import { validateSellerOrder } from "../orders/helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetClaimsParamsType>,
  res: MedusaResponse<HttpTypes.AdminClaimListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const sellerId = req.seller_context!.seller_id

  // order_claim carries no seller_id of its own — resolve the seller's own
  // order ids first so the list can never surface another seller's claims.
  const { data: sellerOrders } = await query.graph({
    entity: "order_seller",
    fields: ["order_id"],
    filters: { seller_id: sellerId },
  })
  const ownOrderIds = sellerOrders.map((so) => so.order_id)

  const { data: claims, metadata } = await query.graph({
    entity: "order_claim",
    fields: req.queryConfig.fields,
    filters: { ...req.filterableFields, order_id: ownOrderIds },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    claims,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  } as HttpTypes.AdminClaimListResponse)
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderClaimsReqType>,
  res: MedusaResponse<HttpTypes.AdminClaimOrderResponse>
) => {
  await validateSellerOrder(
    req.scope,
    req.seller_context!.seller_id,
    req.validatedBody.order_id
  )

  const input = {
    ...req.validatedBody,
    created_by: req.seller_context!.seller_id,
  }

  const { result } = await beginClaimOrderWorkflow(req.scope).run({
    input,
  })

  res.json({
    claim: { id: result.claim_id } as HttpTypes.AdminClaim,
  } as HttpTypes.AdminClaimOrderResponse)
}
