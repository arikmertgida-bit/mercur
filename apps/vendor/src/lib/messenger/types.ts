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

/**
 * `NotificationPayload.type` value used for every review-related messenger
 * notification (new review, seller reply, review-report resolution) — must
 * match `REVIEW_NOTIFICATION_TYPE` in the backend's src/lib/review-events.ts.
 */
export const REVIEW_NOTIFICATION_TYPE = "review_notification"

/**
 * Must match `ORDER_NOTIFICATION_TYPE` in the backend's src/lib/order-events.ts.
 */
export const ORDER_NOTIFICATION_TYPE = "order_notification"

/**
 * Must match `REQUEST_NOTIFICATION_TYPE` in the backend's src/lib/request-events.ts.
 */
export const REQUEST_NOTIFICATION_TYPE = "request_notification"

/**
 * Must match `FOLLOWER_NOTIFICATION_TYPE` in the backend's src/lib/follower-events.ts.
 */
export const FOLLOWER_NOTIFICATION_TYPE = "follower_notification"

/**
 * Must match `PAYOUT_NOTIFICATION_TYPE` in the backend's src/lib/payout-events.ts.
 */
export const PAYOUT_NOTIFICATION_TYPE = "payout_notification"

/**
 * Must match `RETURN_NOTIFICATION_TYPE` in the backend's src/lib/return-events.ts.
 */
export const RETURN_NOTIFICATION_TYPE = "return_notification"

/**
 * Preference-only category key (no persisted `metadata.notification_type` —
 * real chat messages aren't tagged). Must match `NotificationCategory.MESSENGER`
 * in the messenger service's src/constants/notification-types.ts. Gates only
 * the push/toast signal for new messages — see `MessengerGlobalNotifier`.
 */
export const MESSENGER_NOTIFICATION_TYPE = "messenger"

export interface NotificationPreferenceEntry {
  notificationType: string
  enabled: boolean
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

// ── Messaging Context Types ─────────────────────────────────────────────────
/** Stored in Conversation.metadata — persists product or store context without extra API calls */
export type ConversationMetadata =
  | {
      type: "product"
      product_id: string
      product_name: string
      product_image: string | null
      product_handle: string | null
      store_image?: string | null
    }
  | {
      type: "store"
      store_id: string
      store_name: string
      store_image: string | null
    }

export interface ProductContextData {
  id: string
  title: string
  thumbnail: string | null
  handle: string | null
}

export interface VendorContextData {
  id: string
  name: string
  handle: string
  photo: string | null
}

export type ProductMessageContext = { type: "PRODUCT"; data: ProductContextData }
export type VendorMessageContext = { type: "VENDOR"; data: VendorContextData }
export type MessageContext = ProductMessageContext | VendorMessageContext

export interface MessengerContextValue {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Message[]
  pinnedMessages: Message[]
  unreadCount: number
  typingUserIds: string[]
  isConnected: boolean
  isLoadingMessages: boolean
  /** `false` only once explicitly disabled by the seller — missing entries default enabled. */
  isNotificationCategoryEnabled: (notificationType: string) => boolean
  openConversation: (conversationId: string) => void
  openSidebarConversation: (conversationId: string) => Promise<void>
  sendSidebarMessage: (content: string) => Promise<void>
  closeConversation: () => void
  startConversation: (params: {
    targetUserId: string
    targetUserType: string
    type?: "DIRECT" | "ADMIN_SUPPORT"
    subject?: string
    productId?: string
    orderId?: string
    metadata?: Record<string, unknown>
  }) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  uploadImage: (file: File) => Promise<void>
  uploadSidebarImage: (file: File, getOrCreateConvId: () => Promise<string>) => Promise<void>
  deleteMessage: (messageId: string, deleteForAll: boolean) => Promise<void>
  deleteSidebarMessage: (messageId: string, deleteForAll: boolean) => Promise<void>
  deleteConversation: (conversationId: string, deleteForAll: boolean) => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  markRead: (conversationId: string) => Promise<void>
  refreshConversations: () => Promise<void>
}
