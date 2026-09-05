export const MESSENGER_SOCKET_EVENTS = {
  messageReceived: "message_received",
  readReceipt: "read_receipt",
  unreadCountUpdated: "unread_count_updated",
  typingUpdate: "typing_update",
  messageDeleted: "message_deleted",
  conversationDeleted: "conversation_deleted",
  notification: "notification",
  // Generic, payload-light "your data changed, refetch" push — see
  // apps/api/src/lib/messenger.ts's broadcastDashboardSync and
  // messenger/src/constants/socket-events.ts's BROADCASTABLE_EVENTS. Must
  // match that raw string exactly (separate deployables, no shared import).
  dashboardSync: "dashboard_sync",
} as const

export interface UnreadCountUpdatedPayload {
  count: number
}
