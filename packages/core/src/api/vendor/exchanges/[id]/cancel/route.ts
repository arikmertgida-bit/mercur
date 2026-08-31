import { cancelOrderExchangeWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostCancelExchangeReqType } from "../../validators"
import { validateSellerExchange } from "../../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostCancelExchangeReqType>,
  res: MedusaResponse<HttpTypes.AdminExchangeResponse>
) => {
  const { id } = req.params

  await validateSellerExchange(req.scope, req.seller_context!.seller_id, id)

  const { result } = await cancelOrderExchangeWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      exchange_id: id,
      canceled_by: req.seller_context!.seller_id,
    },
  })

  res.status(200).json({ exchange: result as HttpTypes.AdminExchange })
}
