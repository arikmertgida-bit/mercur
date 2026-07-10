import type { MessengerContextValue } from "./types"

type StoreListener = () => void

let snapshot: MessengerContextValue | null = null
const listeners = new Set<StoreListener>()

export function publishMessengerAdminState(value: MessengerContextValue): void {
  snapshot = value
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeMessengerAdminState(listener: StoreListener): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

export function getMessengerAdminSnapshot(): MessengerContextValue | null {
  return snapshot
}

export function hasMessengerAdminSession(): boolean {
  return snapshot !== null
}
