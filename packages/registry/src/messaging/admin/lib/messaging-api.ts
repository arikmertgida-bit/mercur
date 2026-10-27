import { z } from "zod"

import { client } from "./client"

// The messaging routes respond with an untyped `MedusaResponse`, so every
// response is validated here before it reaches the hooks.

const SenderTypeSchema = z.enum(["customer", "seller"])

export const AdminConversationSchema = z.object({
  id: z.string(),
  buyer_id: z.string(),
  seller_id: z.string(),
  buyer_name: z.string().nullish(),
  buyer_email: z.string().nullish(),
  seller_name: z.string().nullish(),
  last_message_preview: z.string().nullable(),
  last_message_sender_type: SenderTypeSchema.nullable(),
  last_message_at: z.string().nullable(),
  unread_count_customer: z.number(),
  unread_count_seller: z.number(),
  created_at: z.string(),
  is_buyer_blocked: z.boolean().optional(),
  block_reason: z.string().nullish(),
})

export const AdminMessageSchema = z.object({
  id: z.string(),
  sender_id: z.string(),
  sender_type: SenderTypeSchema,
  body: z.string(),
  context_type: z.enum(["product", "order"]).nullable(),
  context_id: z.string().nullable(),
  context_label: z.string().nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
})

const AdminConversationListResponseSchema = z.object({
  conversations: z.array(AdminConversationSchema),
  next_cursor: z.string().nullable(),
})

const AdminConversationDetailResponseSchema = z.object({
  conversation: AdminConversationSchema,
  messages: z.array(AdminMessageSchema),
  next_cursor: z.string().nullable(),
})

export const FilterRuleSchema = z.object({
  id: z.string(),
  match_type: z.enum(["exact", "contains", "regex"]),
  pattern: z.string(),
  is_builtin: z.boolean(),
  is_enabled: z.boolean(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const BlockedMessageSchema = z.object({
  id: z.string(),
  sender_id: z.string(),
  sender_type: SenderTypeSchema,
  conversation_id: z.string(),
  matched_rule_id: z.string(),
  message_body: z.string(),
  created_at: z.string(),
})

const FilterListResponseSchema = z.object({
  filter_rules: z.array(FilterRuleSchema),
  count: z.number(),
})

const FilterRuleResponseSchema = z.object({
  filter_rule: FilterRuleSchema,
})

const FilterRuleDeleteResponseSchema = z.object({
  id: z.string(),
  deleted: z.boolean(),
})

const BlockedListResponseSchema = z.object({
  blocked_messages: z.array(BlockedMessageSchema),
  count: z.number(),
})

const ChatBlockResponseSchema = z.object({
  block: z.object({
    id: z.string(),
    customer_id: z.string(),
    reason: z.string().nullable(),
  }),
})

const SuccessResponseSchema = z.object({
  success: z.boolean(),
})

export type AdminConversationListResponse = z.infer<
  typeof AdminConversationListResponseSchema
>
export type AdminConversationDetailResponse = z.infer<
  typeof AdminConversationDetailResponseSchema
>
export type FilterListResponse = z.infer<typeof FilterListResponseSchema>
export type FilterRuleResponse = z.infer<typeof FilterRuleResponseSchema>
export type FilterRuleDeleteResponse = z.infer<
  typeof FilterRuleDeleteResponseSchema
>
export type BlockedListResponse = z.infer<typeof BlockedListResponseSchema>
export type ChatBlockResponse = z.infer<typeof ChatBlockResponseSchema>
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>

type ConversationSearchQuery = Parameters<typeof client.admin.messages.query>[0]
type ConversationDetailQuery = Parameters<
  typeof client.admin.messages.$id.query
>[0]
type BlockedListQuery = Parameters<
  typeof client.admin.messages.blocked.query
>[0]
type CreateFilterPayload = Parameters<
  typeof client.admin.messages.filters.mutate
>[0]
type UpdateFilterPayload = Parameters<
  typeof client.admin.messages.filters.$id.mutate
>[0]
type BlockCustomerPayload = Parameters<
  typeof client.admin.messages.chatBlocks.mutate
>[0]

export const adminMessagesApi = {
  query: async (
    query: ConversationSearchQuery
  ): Promise<AdminConversationListResponse> =>
    AdminConversationListResponseSchema.parse(
      await client.admin.messages.query(query)
    ),
  $id: {
    query: async (
      input: ConversationDetailQuery
    ): Promise<AdminConversationDetailResponse> =>
      AdminConversationDetailResponseSchema.parse(
        await client.admin.messages.$id.query(input)
      ),
  },
  filters: {
    query: async (): Promise<FilterListResponse> =>
      FilterListResponseSchema.parse(
        await client.admin.messages.filters.query({})
      ),
    mutate: async (payload: CreateFilterPayload): Promise<FilterRuleResponse> =>
      FilterRuleResponseSchema.parse(
        await client.admin.messages.filters.mutate(payload)
      ),
    $id: {
      mutate: async (
        payload: UpdateFilterPayload
      ): Promise<FilterRuleResponse> =>
        FilterRuleResponseSchema.parse(
          await client.admin.messages.filters.$id.mutate(payload)
        ),
      delete: async (payload: { $id: string }): Promise<FilterRuleDeleteResponse> =>
        FilterRuleDeleteResponseSchema.parse(
          await client.admin.messages.filters.$id.delete(payload)
        ),
    },
  },
  blocked: {
    query: async (query: BlockedListQuery): Promise<BlockedListResponse> =>
      BlockedListResponseSchema.parse(
        await client.admin.messages.blocked.query(query)
      ),
  },
  chatBlocks: {
    mutate: async (data: BlockCustomerPayload): Promise<ChatBlockResponse> =>
      ChatBlockResponseSchema.parse(
        await client.admin.messages.chatBlocks.mutate(data)
      ),
    $customerId: {
      delete: async (payload: {
        $customerId: string
      }): Promise<SuccessResponse> =>
        SuccessResponseSchema.parse(
          await client.admin.messages.chatBlocks.$customerId.delete(payload)
        ),
    },
  },
}
