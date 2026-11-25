import { createContext, useContext, useSyncExternalStore } from "react"
import {
  getMessengerVendorSnapshot,
  subscribeMessengerVendorState,
} from "../../lib/messenger/MessengerVendorBridge"
import type { MessengerContextValue } from "../../lib/messenger/types"

export const MessengerContext = createContext<MessengerContextValue | null>(null)

export function useMessengerUnreads(): Array<{ unreadMessageCount: number }> {
  const ctx = useContext(MessengerContext)
  const count = ctx?.unreadCount ?? 0
  return Array.from({ length: count }, () => ({ unreadMessageCount: 1 }))
}

/**
 * Returns unread count only for ADMIN_SUPPORT conversations.
 * Used by the Support button in the header so its badge reflects only
 * admin-support messages, not customer traffic.
 */
export function useMessengerAdminUnreads(): Array<{ unreadMessageCount: number }> {
  const ctx = useContext(MessengerContext)
  if (!ctx) return []
  const { conversations } = ctx
  const count = conversations
    .filter((c) => c.type === "ADMIN_SUPPORT")
    .reduce((sum, c) => {
      const selfParticipant = c.participants.find((p) => p.userType === "SELLER")
      return sum + (selfParticipant?.unreadCount ?? 0)
    }, 0)
  return Array.from({ length: count }, () => ({ unreadMessageCount: 1 }))
}

export function useMessenger(): MessengerContextValue {
  const ctx = useContext(MessengerContext)
  const bridged = useSyncExternalStore(
    subscribeMessengerVendorState,
    getMessengerVendorSnapshot,
    getMessengerVendorSnapshot
  )
  if (ctx) {
    return ctx
  }
  if (bridged) {
    return bridged
  }
  throw new Error("useMessenger must be used inside MessengerProvider or after session bootstrap")
}
