import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { AdminRequestResponse, parseRequestEntity, parseRequestEntityType } from "../../../../../types/requests"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminRequestResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  if (!req.params.type) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Request type is required")
  }
  const alias = parseRequestEntityType(req.params.type)

  const {
    data: [entity],
  } = await query.graph({
    entity: alias,
    fields: ["id", "custom_fields.*", ...req.queryConfig.fields],
    filters: { id: req.params.id },
  })

  if (!entity) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Request not found")
  }

  res.json({ request: parseRequestEntity(entity) })
}
