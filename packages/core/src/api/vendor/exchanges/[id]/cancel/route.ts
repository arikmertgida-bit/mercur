import { cancelOrderExchangeWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { VendorPostCancelExchangeReqType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostCancelExchangeReqType>,
  res: MedusaResponse<HttpTypes.VendorCancelExchangeResponse>
) => {
  const { id } = req.params

  await cancelOrderExchangeWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      exchange_id: id,
      canceled_by: getSellerId(req),
    },
  })

  res.status(200).json({})
}
