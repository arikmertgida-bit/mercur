import { cancelBeginOrderClaimWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { confirmClaimRequestWorkflow } from "../../../../../workflows/order/workflows/confirm-claim-request"
import { getSellerId } from "../../../../utils/seller-context"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id } = req.params

  const { result } = await confirmClaimRequestWorkflow(req.scope).run({
    input: {
      claim_id: id,
      confirmed_by: getSellerId(req),
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminClaimDeleteResponse>
) => {
  const { id } = req.params

  await cancelBeginOrderClaimWorkflow(req.scope).run({
    input: { claim_id: id },
  })

  res.status(200).json({
    id,
    object: "claim",
    deleted: true,
  })
}
