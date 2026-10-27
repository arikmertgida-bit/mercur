import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { ensureDefined } from "@mercurjs/core/utils/ensure-defined"
import { parseGraphRows } from "@mercurjs/core/utils/graph-rows"
import { z } from "zod"

import { MESSAGING_MODULE } from "../../../../modules/messaging"
import type MessagingModuleService from "../../../../modules/messaging/service"
import { AdminGetMessagesType } from "../validators"

const CustomerNameRowSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
})

const SellerNameRowSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const GET = async (
  req: AuthenticatedMedusaRequest<Partial<AdminGetMessagesType>, AdminGetMessagesType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MessagingModuleService>(MESSAGING_MODULE)
  const conversationId = ensureDefined(req.params.id, "Conversation id")

  // Admin can access any conversation — no ownership check
  const [conversation] = await service.listConversations(
    { id: conversationId },
    { take: 1 }
  )

  if (!conversation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Conversation not found"
    )
  }

  const queryParams = req.validatedQuery
  const { data: messages, next_cursor } = await service.listMessagesCursor(
    conversationId,
    {
      cursor: queryParams.cursor,
      limit: queryParams.limit,
    }
  )

  // Resolve buyer + seller names for admin view
  let buyer_name: string | null = null
  let buyer_email: string | null = null
  let seller_name: string | null = null

  try {
    const query = req.scope.resolve("query")

    const { data: customerRows } = await query.graph({
      entity: "customer",
      fields: ["id", "first_name", "last_name", "email"],
      filters: { id: conversation.buyer_id },
    })

    const [customer] = parseGraphRows(CustomerNameRowSchema, customerRows)
    if (customer) {
      buyer_name = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ")
      buyer_email = customer.email
    }

    const { data: sellerRows } = await query.graph({
      entity: "seller",
      fields: ["id", "name"],
      filters: { id: conversation.seller_id },
    })

    const [seller] = parseGraphRows(SellerNameRowSchema, sellerRows)
    if (seller) {
      seller_name = seller.name
    }
  } catch {
    // Continue without enrichment
  }

  // Check block status with reason
  const blockDetail = await service.getBlockDetail(conversation.buyer_id)

  res.json({
    conversation: {
      ...conversation,
      buyer_name,
      buyer_email,
      seller_name,
      is_buyer_blocked: blockDetail.blocked,
      block_reason: blockDetail.reason,
    },
    messages,
    next_cursor,
  })
}
