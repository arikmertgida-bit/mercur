import { beginReturnOrderWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
  promiseAll,
} from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerOrder } from "../orders/helpers"
import {
  VendorGetReturnsParamsInput,
  VendorGetReturnsParamsType,
  VendorPostReturnsReqType,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"
import { toHttpOrder } from "../../../utils/http-order"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    VendorGetReturnsParamsInput,
    VendorGetReturnsParamsType
  >,
  res: MedusaResponse<HttpTypes.VendorReturnListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: returns, metadata } = await query.graph({
    entity: "return",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    returns,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostReturnsReqType>,
  res: MedusaResponse<HttpTypes.VendorOrderReturnResponse>
) => {
  await validateSellerOrder(
    req.scope,
    getSellerId(req),
    req.validatedBody.order_id
  )

  const input = {
    ...req.validatedBody,
    created_by: getSellerId(req),
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderModuleService = req.scope.resolve(Modules.ORDER)

  const workflow = beginReturnOrderWorkflow(req.scope)
  const { result } = await workflow.run({
    input,
  })

  const [order, { data: returnData }] = await promiseAll([
    orderModuleService.retrieveOrder(result.order_id),
    query.graph({
      entity: "return",
      fields: req.queryConfig.fields,
      filters: {
        id: result.return_id,
        ...req.filterableFields,
      },
    }),
  ])

  res.json({
    order: toHttpOrder(order),
    return: returnData[0],
  })
}
