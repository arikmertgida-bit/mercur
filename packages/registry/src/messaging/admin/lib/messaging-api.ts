import { client } from "./client"
import type {
  FilterListResponse,
  FilterRuleDTO,
  BlockedListResponse,
} from "../hooks/api/filters"
import type {
  AdminConversationListResponse,
  AdminConversationDetailResponse,
} from "../hooks/api/messaging"

type AdminMessagesFiltersApi = {
  query: () => Promise<FilterListResponse>
  mutate: (payload: {
    match_type: string
    pattern: string
    description?: string
    is_enabled?: boolean
  }) => Promise<{ filter_rule: FilterRuleDTO }>
  $id: {
    mutate: (payload: {
      $id: string
      is_enabled?: boolean
      description?: string | null
      pattern?: string
      match_type?: string
    }) => Promise<{ filter_rule: FilterRuleDTO }>
    delete: (payload: { $id: string }) => Promise<{ id: string; deleted: boolean }>
  }
}

type AdminMessagesApi = {
  query: (query: Record<string, string | number | undefined>) => Promise<AdminConversationListResponse>
  $id: {
    query: (input: {
      $id: string
      limit?: number
      cursor?: string
    }) => Promise<AdminConversationDetailResponse>
  }
  filters: AdminMessagesFiltersApi
  blocked: {
    query: (query: Record<string, string | undefined>) => Promise<BlockedListResponse>
  }
  "chat-blocks": {
    mutate: (data: {
      customer_id: string
      reason?: string
    }) => Promise<{ block: { id: string; customer_id: string; reason: string | null } }>
    $customer_id: {
      delete: (payload: { $customer_id: string }) => Promise<{ success: boolean }>
    }
  }
}

type AdminClientWithMessages = {
  messages: AdminMessagesApi
}

export const adminMessagesApi = (
  client.admin as typeof client.admin & AdminClientWithMessages
).messages
