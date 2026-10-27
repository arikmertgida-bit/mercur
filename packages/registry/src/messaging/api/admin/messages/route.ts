import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { MESSAGING_MODULE } from "../../../modules/messaging"
import type MessagingModuleService from "../../../modules/messaging/service"
import { AdminSearchConversationsType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<AdminSearchConversationsType>,
    AdminSearchConversationsType
  >,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MessagingModuleService>(MESSAGING_MODULE)

  const {
    cursor,
    limit,
    seller_name,
    buyer_name,
    date_from,
    date_to,
    context_type,
    context_id,
  } = req.validatedQuery

  const { data: conversations, next_cursor } =
    await service.searchConversationsAdmin(
      {
        seller_name,
        buyer_name,
        date_from,
        date_to,
        context_type,
        context_id,
      },
      { cursor, limit }
    )

  // Annotate block status
  const buyerIds = [...new Set(conversations.map((c) => c.buyer_id))]
  const blockedSet = await service.checkBuyersBlocked(buyerIds)
  const enriched = conversations.map((conv) => ({
    ...conv,
    is_buyer_blocked: blockedSet.has(conv.buyer_id),
  }))

  res.json({ conversations: enriched, next_cursor })
}
