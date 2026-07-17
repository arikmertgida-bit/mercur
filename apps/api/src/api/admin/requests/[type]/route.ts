import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  AdminRequestListResponse,
  isRequestEntity,
  parseRequestEntitySafe,
  parseRequestEntityType,
} from "../../../../types/requests"
import { AdminGetRequestsParamsType } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest<AdminGetRequestsParamsType>,
  res: MedusaResponse<AdminRequestListResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  if (!req.params.type) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Request type is required")
  }
  const alias = parseRequestEntityType(req.params.type)

  const { data: entities, metadata } = await query.graph({
    entity: alias,
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  const requests = entities.map(parseRequestEntitySafe).filter(isRequestEntity)

  res.json({
    requests,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
