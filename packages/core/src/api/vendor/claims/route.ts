import { beginClaimOrderWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  VendorGetClaimsParamsInput,
  VendorGetClaimsParamsType,
  VendorPostOrderClaimsReqType,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    VendorGetClaimsParamsInput,
    VendorGetClaimsParamsType
  >,
  res: MedusaResponse<HttpTypes.AdminClaimListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: claims, metadata } = await query.graph({
    entity: "order_claim",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    claims,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderClaimsReqType>,
  // The begin workflow only reports the new claim's id; the dashboard fetches
  // the claim itself afterwards.
  res: MedusaResponse<{ claim: Pick<HttpTypes.AdminClaim, "id"> }>
) => {
  const input = {
    ...req.validatedBody,
    created_by: getSellerId(req),
  }

  const { result } = await beginClaimOrderWorkflow(req.scope).run({
    input,
  })

  res.json({
    claim: { id: result.claim_id },
  })
}
