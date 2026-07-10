import type { MessengerContextValue } from "./types"

type StoreListener = () => void

let snapshot: MessengerContextValue | null = null
const listeners = new Set<StoreListener>()

export function publishMessengerVendorState(value: MessengerContextValue): void {
  snapshot = value
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeMessengerVendorState(listener: StoreListener): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

export function getMessengerVendorSnapshot(): MessengerContextValue | null {
  return snapshot
}

export function hasMessengerVendorSession(): boolean {
  return snapshot !== null
}
