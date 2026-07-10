export const MESSENGER_SOCKET_EVENTS = {
  messageReceived: "message_received",
  readReceipt: "read_receipt",
  unreadCountUpdated: "unread_count_updated",
  typingUpdate: "typing_update",
  messageDeleted: "message_deleted",
  conversationDeleted: "conversation_deleted",
  notification: "notification",
} as const

export interface UnreadCountUpdatedPayload {
  count: number
}
