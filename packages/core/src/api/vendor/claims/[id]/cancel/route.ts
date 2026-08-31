import { cancelOrderClaimWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostCancelClaimReqType } from "../../validators"
import { validateSellerClaim } from "../../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostCancelClaimReqType>,
  res: MedusaResponse<HttpTypes.AdminClaimResponse>
) => {
  const { id } = req.params

  await validateSellerClaim(req.scope, req.seller_context!.seller_id, id)

  const { result } = await cancelOrderClaimWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      claim_id: id,
      canceled_by: req.seller_context!.seller_id,
    },
  })

  res.status(200).json({ claim: result as HttpTypes.AdminClaim })
}
