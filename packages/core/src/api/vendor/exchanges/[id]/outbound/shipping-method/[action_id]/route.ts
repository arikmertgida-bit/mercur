import {
  removeExchangeShippingMethodWorkflow,
  updateExchangeShippingMethodWorkflow,
} from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"

import { VendorPostExchangesShippingActionReqType } from "../../../../validators"
import { toHttpOrderPreview } from "../../../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostExchangesShippingActionReqType>,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id, action_id } = req.params

  const { result } = await updateExchangeShippingMethodWorkflow(req.scope).run({
    input: {
      data: { ...req.validatedBody },
      exchange_id: id,
      action_id,
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id, action_id } = req.params

  const { result } = await removeExchangeShippingMethodWorkflow(req.scope).run({
    input: {
      exchange_id: id,
      action_id,
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}
