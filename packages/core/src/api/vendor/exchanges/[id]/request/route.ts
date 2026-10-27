import { cancelBeginOrderExchangeWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { confirmExchangeRequestWorkflow } from "../../../../../workflows/order/workflows/confirm-exchange-request"
import { getSellerId } from "../../../../utils/seller-context"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id } = req.params

  const { result } = await confirmExchangeRequestWorkflow(req.scope).run({
    input: {
      exchange_id: id,
      confirmed_by: getSellerId(req),
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminExchangeDeleteResponse>
) => {
  const { id } = req.params

  await cancelBeginOrderExchangeWorkflow(req.scope).run({
    input: { exchange_id: id },
  })

  res.status(200).json({
    id,
    object: "exchange",
    deleted: true,
  })
}
