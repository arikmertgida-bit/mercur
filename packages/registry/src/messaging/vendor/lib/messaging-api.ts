import { z } from "zod"

import { client } from "./client"

// The messaging routes respond with an untyped `MedusaResponse`, so every
// response is validated here before it reaches the hooks.

const SenderTypeSchema = z.enum(["customer", "seller"])

export const ConversationSchema = z.object({
  id: z.string(),
  seller_id: z.string(),
  buyer_id: z.string(),
  buyer_first_name: z.string().nullish(),
  last_message_preview: z.string().nullable(),
  last_message_sender_type: SenderTypeSchema.nullable(),
  last_message_at: z.string().nullable(),
  unread_count_seller: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  is_buyer_blocked: z.boolean().optional(),
})

export const MessageSchema = z.object({
  id: z.string(),
  sender_type: SenderTypeSchema,
  body: z.string(),
  context_type: z.enum(["product", "order"]).nullable(),
  context_id: z.string().nullable(),
  context_label: z.string().nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
})

export const BuyerOrderSummarySchema = z.object({
  id: z.string(),
  display_id: z.union([z.number(), z.string()]),
  status: z.string(),
  total: z.number(),
  currency_code: z.string(),
  created_at: z.string(),
})

const ConversationListResponseSchema = z.object({
  conversations: z.array(ConversationSchema),
  next_cursor: z.string().nullable(),
})

const ConversationDetailResponseSchema = z.object({
  conversation: ConversationSchema,
  messages: z.array(MessageSchema),
  next_cursor: z.string().nullable(),
  buyer_orders: z.array(BuyerOrderSummarySchema),
})

const SendReplyResponseSchema = z.object({
  message: MessageSchema,
})

const MarkReadResponseSchema = z.object({
  success: z.boolean(),
})

const UnreadResponseSchema = z.object({
  unread_count: z.number(),
})

export type ConversationListResponse = z.infer<
  typeof ConversationListResponseSchema
>
export type ConversationDetailResponse = z.infer<
  typeof ConversationDetailResponseSchema
>
export type SendReplyResponse = z.infer<typeof SendReplyResponseSchema>
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>
export type UnreadResponse = z.infer<typeof UnreadResponseSchema>

type ConversationListQuery = Parameters<typeof client.vendor.messages.query>[0]
type ConversationDetailQuery = Parameters<
  typeof client.vendor.messages.$id.query
>[0]
type SendReplyPayload = Parameters<typeof client.vendor.messages.$id.mutate>[0]

export const vendorMessagesApi = {
  query: async (
    query: ConversationListQuery
  ): Promise<ConversationListResponse> =>
    ConversationListResponseSchema.parse(
      await client.vendor.messages.query(query)
    ),
  $id: {
    query: async (
      input: ConversationDetailQuery
    ): Promise<ConversationDetailResponse> =>
      ConversationDetailResponseSchema.parse(
        await client.vendor.messages.$id.query(input)
      ),
    mutate: async (payload: SendReplyPayload): Promise<SendReplyResponse> =>
      SendReplyResponseSchema.parse(
        await client.vendor.messages.$id.mutate(payload)
      ),
    read: {
      mutate: async (payload: { $id: string }): Promise<MarkReadResponse> =>
        MarkReadResponseSchema.parse(
          await client.vendor.messages.$id.read.mutate(payload)
        ),
    },
  },
  unread: {
    query: async (): Promise<UnreadResponse> =>
      UnreadResponseSchema.parse(await client.vendor.messages.unread.query()),
  },
}
