import { orderClaimItemWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"

import { VendorPostClaimItemsReqType } from "../../validators"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostClaimItemsReqType>,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id } = req.params

  const { result } = await orderClaimItemWorkflow(req.scope).run({
    input: { ...req.validatedBody, claim_id: id },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}
