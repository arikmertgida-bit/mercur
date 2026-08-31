import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  refetchEntity,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/framework/types"

import { validateSellerClaim } from "../helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest<{}, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.AdminClaimResponse>
) => {
  await validateSellerClaim(req.scope, req.seller_context!.seller_id, req.params.id)

  const claim = await refetchEntity({
    entity: "order_claim",
    idOrFilter: req.params.id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  if (!claim) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Claim with id: ${req.params.id} was not found`
    )
  }

  res.status(200).json({ claim })
}
