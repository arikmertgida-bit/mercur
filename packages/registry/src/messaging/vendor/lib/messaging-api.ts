import { client } from "./client"
import type {
  ConversationListResponse,
  ConversationDetailResponse,
  MessageDTO,
} from "../hooks/api/messaging"

type VendorMessagesApi = {
  query: (query: {
    cursor?: string
    limit?: number
  }) => Promise<ConversationListResponse>
  $id: {
    query: (input: {
      $id: string
      limit?: number
      cursor?: string
    }) => Promise<ConversationDetailResponse>
    mutate: (payload: {
      $id: string
      body: string
    }) => Promise<{ message: MessageDTO }>
    read: {
      mutate: (payload: { $id: string }) => Promise<{ success: boolean }>
    }
  }
  unread: {
    query: () => Promise<{ unread_count: number }>
  }
}

type VendorClientWithMessages = {
  messages: VendorMessagesApi
}

export const vendorMessagesApi = (
  client.vendor as typeof client.vendor & VendorClientWithMessages
).messages
