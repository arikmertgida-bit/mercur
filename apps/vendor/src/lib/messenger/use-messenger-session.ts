import { useSyncExternalStore } from "react"

import { kayiEventManager } from "./KayiEventManager"

const subscribe = (onChange: () => void): (() => void) =>
  kayiEventManager.subscribeSession(onChange)

const getSnapshot = (): string | null => kayiEventManager.getSessionSellerId()

/**
 * The seller whose messenger token is ready, or null while there is none
 * (before MessengerProvider checked the token, after a store switch, or when
 * the store has no messages right). Messenger calls made outside the provider
 * wait for this instead of reading localStorage on mount.
 */
export function useMessengerSession(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
