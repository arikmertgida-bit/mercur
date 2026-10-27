import { cancelOrderClaimWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { VendorPostCancelClaimReqType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostCancelClaimReqType>,
  res: MedusaResponse<HttpTypes.VendorCancelClaimResponse>
) => {
  const { id } = req.params

  await cancelOrderClaimWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      claim_id: id,
      canceled_by: getSellerId(req),
    },
  })

  res.status(200).json({})
}
