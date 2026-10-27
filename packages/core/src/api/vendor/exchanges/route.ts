import { beginExchangeOrderWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  VendorGetExchangesParamsInput,
  VendorGetExchangesParamsType,
  VendorPostOrderExchangesReqType,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    VendorGetExchangesParamsInput,
    VendorGetExchangesParamsType
  >,
  res: MedusaResponse<HttpTypes.AdminExchangeListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: exchanges, metadata } = await query.graph({
    entity: "order_exchange",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    exchanges,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderExchangesReqType>,
  // The begin workflow only reports the new exchange's id; the dashboard fetches
  // the exchange itself afterwards.
  res: MedusaResponse<{ exchange: Pick<HttpTypes.AdminExchange, "id"> }>
) => {
  const input = {
    ...req.validatedBody,
    created_by: getSellerId(req),
  }

  const { result } = await beginExchangeOrderWorkflow(req.scope).run({
    input,
  })

  res.json({
    exchange: { id: result.exchange_id },
  })
}
