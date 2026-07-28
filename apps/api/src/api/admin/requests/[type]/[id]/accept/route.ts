import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { resolveKayiLogger } from "../../../../../../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../../../../../../lib/messenger"
import { REQUEST_NOTIFICATION_TYPE, REQUEST_TYPE_LABELS } from "../../../../../../lib/request-events"
import { AdminRequestResponse, parseRequestEntity, parseRequestEntityType } from "../../../../../../types/requests"
import { acceptRequestWorkflow } from "../../../../../../workflows/requests/workflows"
import { AdminReviewNoteType } from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<AdminReviewNoteType>,
  res: MedusaResponse<AdminRequestResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = resolveKayiLogger(req.scope)

  const entityId = req.params.id
  if (!req.params.type || !entityId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Request type and id are required")
  }
  const alias = parseRequestEntityType(req.params.type)

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

  if (!entity) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Request not found")
  }

  const parsed = parseRequestEntity(entity)
  const submitterId = parsed.custom_fields.submitter_id

  if (submitterId) {
    const label = REQUEST_TYPE_LABELS[alias] ?? "Talep"
    const notified = await notifyMessengerUser({
      targetUserId: submitterId,
      targetUserType: "SELLER",
      senderName: "Kayı.com",
      preview: `${label} talebiniz onaylandı.`,
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: "Talep Durumu",
      conversationType: "ADMIN_SUPPORT",
      notificationType: REQUEST_NOTIFICATION_TYPE,
      metadata: { notification_type: REQUEST_NOTIFICATION_TYPE },
    })
    if (!notified) {
      logger.warn(`[requests/accept] Messenger notify was not accepted for ${alias} ${entityId}`)
    }
  }

  res.json({ request: parsed })
}
