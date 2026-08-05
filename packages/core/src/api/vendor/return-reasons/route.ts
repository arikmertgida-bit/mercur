import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { getUnapprovedReturnReasonIds } from "../../../utils/return-reason-visibility"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorReturnReasonListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const unapprovedIds = await getUnapprovedReturnReasonIds(req.scope)

  const { data: return_reasons, metadata } = await query.graph({
    entity: "return_reason",
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      ...(unapprovedIds.length ? { id: { $nin: unapprovedIds } } : {}),
    },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    return_reasons,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
