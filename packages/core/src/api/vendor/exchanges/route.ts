import { beginExchangeOrderWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  VendorGetExchangesParamsType,
  VendorPostOrderExchangesReqType,
} from "./validators"
import { validateSellerOrder } from "../orders/helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetExchangesParamsType>,
  res: MedusaResponse<HttpTypes.AdminExchangeListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const sellerId = req.seller_context!.seller_id

  // order_exchange carries no seller_id of its own — resolve the seller's
  // own order ids first so the list can never surface another seller's
  // exchanges.
  const { data: sellerOrders } = await query.graph({
    entity: "order_seller",
    fields: ["order_id"],
    filters: { seller_id: sellerId },
  })
  const ownOrderIds = sellerOrders.map((so) => so.order_id)

  const { data: exchanges, metadata } = await query.graph({
    entity: "order_exchange",
    fields: req.queryConfig.fields,
    filters: { ...req.filterableFields, order_id: ownOrderIds },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    exchanges,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  } as HttpTypes.AdminExchangeListResponse)
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderExchangesReqType>,
  res: MedusaResponse<HttpTypes.AdminExchangeOrderResponse>
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

  const { result } = await beginExchangeOrderWorkflow(req.scope).run({
    input,
  })

  res.json({
    exchange: { id: result.exchange_id } as HttpTypes.AdminExchange,
  } as HttpTypes.AdminExchangeOrderResponse)
}
