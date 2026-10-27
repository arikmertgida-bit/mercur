import {
  removeReturnShippingMethodWorkflow,
  updateReturnShippingMethodWorkflow,
} from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerReturn } from "../../../helpers"
import { VendorPostReturnsShippingActionReqType } from "../../../validators"
import { getSellerId } from "../../../../../utils/seller-context"
import { toHttpOrderPreview } from "../../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostReturnsShippingActionReqType>,
  res: MedusaResponse<HttpTypes.VendorReturnPreviewResponse>
) => {
  const { id, action_id } = req.params

  await validateSellerReturn(req.scope, getSellerId(req), id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result } = await updateReturnShippingMethodWorkflow(req.scope).run({
    input: {
      data: { ...req.validatedBody },
      return_id: id,
      action_id,
    },
  })

  const {
    data: [orderReturn],
  } = await query.graph({
    entity: "return",
    fields: req.queryConfig.fields,
    filters: {
      id,
      ...req.filterableFields,
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
    return: orderReturn,
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorReturnPreviewResponse>
) => {
  const { id, action_id } = req.params

  await validateSellerReturn(req.scope, getSellerId(req), id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: orderPreview } = await removeReturnShippingMethodWorkflow(
    req.scope
  ).run({
    input: {
      return_id: id,
      action_id,
    },
  })

  const {
    data: [orderReturn],
  } = await query.graph({
    entity: "return",
    fields: req.queryConfig.fields,
    filters: {
      id,
      ...req.filterableFields,
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(orderPreview),
    return: orderReturn,
  })
}
