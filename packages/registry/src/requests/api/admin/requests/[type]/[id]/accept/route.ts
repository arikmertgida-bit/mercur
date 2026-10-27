import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureDefined } from "@mercurjs/core/utils/ensure-defined"

import { AdminRequestResponse } from "../../../../../../types"
import { acceptRequestWorkflow } from "../../../../../../workflows/requests/workflows"
import { AdminReviewNoteType } from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<AdminReviewNoteType>,
  res: MedusaResponse<AdminRequestResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const alias = ensureDefined(req.params.type, "Request type")
  const entityId = ensureDefined(req.params.id, "Request id")

  await acceptRequestWorkflow(req.scope).run({
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

  res.json({ request: entity })
}
