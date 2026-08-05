import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/framework/types"

import { getUnapprovedReturnReasonIds } from "../../../utils/return-reason-visibility"

/**
 * Overrides Medusa's native `/store/return-reasons` — return reasons
 * submitted by a seller through the "Talep Et" request flow must stay
 * hidden from customers until an admin accepts the request.
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<HttpTypes.StoreReturnReasonListResponse>
): Promise<void> => {
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
