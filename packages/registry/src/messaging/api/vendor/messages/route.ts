import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { MESSAGING_MODULE } from "../../../modules/messaging"
import type MessagingModuleService from "../../../modules/messaging/service"
import { parseGraphRows } from "@mercurjs/core/utils/graph-rows"
import { z } from "zod"

import { VendorListConversationsType } from "./validators"

const CustomerFirstNameRowSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
})

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<VendorListConversationsType>,
    VendorListConversationsType
  >,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MessagingModuleService>(MESSAGING_MODULE)
  const sellerId = req.auth_context.actor_id

  const { data: conversations, next_cursor } =
    await service.listConversationsCursor(
      { seller_id: sellerId },
      {
        cursor: req.validatedQuery.cursor,
        limit: req.validatedQuery.limit,
      }
    )

  const buyerIds = [...new Set(conversations.map((c) => c.buyer_id))]

  // Resolve buyer first names via customer link
  let buyerFirstNames: Map<string, string | null> | null = null
  if (buyerIds.length > 0) {
    try {
      const query = req.scope.resolve("query")

      const { data: customerRows } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name"],
        filters: { id: buyerIds },
      })

      buyerFirstNames = new Map(
        parseGraphRows(CustomerFirstNameRowSchema, customerRows).map((c) => [
          c.id,
          c.first_name,
        ])
      )
    } catch {
      // Continue without buyer names
    }
  }

  // Annotate block status
  const blockedSet = await service.checkBuyersBlocked(buyerIds)
  const enriched = conversations.map((conv) => ({
    ...conv,
    ...(buyerFirstNames
      ? { buyer_first_name: buyerFirstNames.get(conv.buyer_id) ?? null }
      : {}),
    is_buyer_blocked: blockedSet.has(conv.buyer_id),
  }))

  res.json({ conversations: enriched, next_cursor })
}
