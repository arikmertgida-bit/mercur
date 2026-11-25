import { createContext, useContext, useSyncExternalStore } from "react"
import {
  getMessengerAdminSnapshot,
  subscribeMessengerAdminState,
} from "../../lib/messenger/MessengerAdminBridge"
import type { MessengerContextValue } from "../../lib/messenger/types"

export const MessengerAdminContext = createContext<MessengerContextValue | null>(null)

export function useMessengerAdmin(): MessengerContextValue {
  const ctx = useContext(MessengerAdminContext)
  const bridged = useSyncExternalStore(
    subscribeMessengerAdminState,
    getMessengerAdminSnapshot,
    getMessengerAdminSnapshot
  )
  if (ctx) {
    return ctx
  }
  if (bridged) {
    return bridged
  }
  throw new Error("useMessengerAdmin must be used inside MessengerAdminProvider or after session bootstrap")
}
