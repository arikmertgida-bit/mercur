import { cancelReturnWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerReturn } from "../../helpers"
import { VendorPostCancelReturnReqType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostCancelReturnReqType>,
  res: MedusaResponse<HttpTypes.VendorCancelReturnResponse>
) => {
  const { id } = req.params

  await validateSellerReturn(req.scope, getSellerId(req), id)

  const workflow = cancelReturnWorkflow(req.scope)
  await workflow.run({
    input: {
      ...req.validatedBody,
      return_id: id,
    },
  })

  res.status(200).json({})
}
