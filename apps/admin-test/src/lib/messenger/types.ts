export type UserType = "CUSTOMER" | "SELLER" | "ADMIN"
export type MessageType = "TEXT" | "IMAGE" | "NOTIFICATION"
export type ConversationType = "DIRECT" | "ADMIN_SUPPORT"
export type ConversationContextType = "PRODUCT_BASED" | "VENDOR_BASED"

export interface Participant {
  id: string
  conversationId: string
  userId: string
  userType: UserType
  unreadCount: number
  lastReadAt: string | null
  joinedAt: string
  /** Display name enriched from server-side cache. Null when not yet cached. */
  displayName: string | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderType: UserType
  content: string
  messageType: MessageType
  imageUrl: string | null
  readAt: string | null
  createdAt: string
  deletedForAll?: boolean
}

export type ConversationMetadata =
  | {
      type: "product"
      product_id: string
      product_name: string
      product_image: string | null
    }
  | {
      type: "store"
      store_id: string
      store_name: string
      store_image: string | null
    }

export interface Conversation {
  id: string
  type: ConversationType
  contextType: ConversationContextType
  subject: string | null
  productId: string | null
  orderId: string | null
  metadata: ConversationMetadata | null
  createdAt: string
  updatedAt: string
  participants: Participant[]
  messages: Message[]
}

export interface NotificationPayload {
  type: string
  conversationId?: string
  senderName: string
  preview: string
}

export interface ReadReceiptPayload {
  conversationId: string
  userId: string
  readAt: string
}

export interface TypingUpdatePayload {
  conversationId: string
  typingUserIds: string[]
}

export const ConversationTypes = {
  DIRECT: "DIRECT",
  ADMIN_SUPPORT: "ADMIN_SUPPORT",
} as const

export const MessageTypes = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  NOTIFICATION: "NOTIFICATION",
} as const

export const UserTypes = {
  CUSTOMER: "CUSTOMER",
  SELLER: "SELLER",
  ADMIN: "ADMIN",
} as const

export interface ProductContextData {
  id: string
  title: string
  thumbnail: string | null
  handle: string | null
}

export type MessageContext =
  | { type: "PRODUCT"; data: ProductContextData }
  | { type: "VENDOR"; data: Record<string, never> }

export interface MessengerContextValue {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Message[]
  unreadCount: number
  typingUserIds: string[]
  isConnected: boolean
  isLoadingMessages: boolean
  openConversation: (conversationId: string) => void
  closeConversation: () => void
  startConversation: (params: {
    targetUserId: string
    targetUserType: string
    type?: "DIRECT" | "ADMIN_SUPPORT"
    subject?: string
  }) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  uploadImage: (file: File) => Promise<void>
  deleteMessage: (messageId: string, deleteForAll: boolean) => Promise<void>
  deleteConversation: (conversationId: string, deleteForAll: boolean) => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  markRead: (conversationId: string) => Promise<void>
  refreshConversations: () => Promise<void>
}
