import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { ensureDefined } from "@mercurjs/core/utils/ensure-defined"

import { MESSAGING_MODULE } from "../../../../../modules/messaging"
import type MessagingModuleService from "../../../../../modules/messaging/service"
import { markMessagesReadWorkflow } from "../../../../../workflows/messaging/workflows/mark-messages-read"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MessagingModuleService>(MESSAGING_MODULE)
  const customerId = req.auth_context.actor_id
  const conversationId = ensureDefined(req.params.id, "Conversation id")

  // Verify ownership
  const [conversation] = await service.listConversations(
    { id: conversationId, buyer_id: customerId },
    { take: 1 }
  )

  if (!conversation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Conversation not found"
    )
  }

  await markMessagesReadWorkflow.run({
    container: req.scope,
    input: {
      conversation_id: conversationId,
      reader_id: customerId,
      reader_type: "customer",
      sender_id: conversation.seller_id,
    },
  })

  res.json({ success: true, unread_count_customer: 0 })
}
