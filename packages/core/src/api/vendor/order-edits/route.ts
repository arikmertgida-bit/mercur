import { beginOrderEditOrderWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostOrderEditsReqType } from "./validators"
import { toHttpOrderChange } from "../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditResponse>
) => {
  const input = req.validatedBody

  const { result } = await beginOrderEditOrderWorkflow(req.scope).run({
    input,
  })

  res.json({
    order_change: toHttpOrderChange(result),
  })
}
