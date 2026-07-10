import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { AdminRequestResponse, parseRequestEntity, parseRequestEntityType } from "../../../../../../types/requests"
import { rejectRequestWorkflow } from "../../../../../../workflows/requests/workflows"
import { AdminReviewNoteType } from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<AdminReviewNoteType>,
  res: MedusaResponse<AdminRequestResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const entityId = req.params.id
  if (!req.params.type || !entityId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Request type and id are required")
  }
  const alias = parseRequestEntityType(req.params.type)

  await rejectRequestWorkflow(req.scope).run({
    input: {
      alias,
      entity_id: entityId,
      reviewer_id: req.auth_context.actor_id,
      reviewer_note: req.validatedBody?.reviewer_note,
    },
  })

  const {
    data: [entity],
  } = await query.graph({
    entity: alias,
    fields: ["id", "custom_fields.*"],
    filters: { id: entityId },
  })

  if (!entity) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Request not found")
  }

  res.json({ request: parseRequestEntity(entity) })
}
