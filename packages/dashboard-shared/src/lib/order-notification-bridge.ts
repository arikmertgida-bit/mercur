type UnreadCountListener = (count: number) => void
type MarkReadRequestListener = () => void

/**
 * Cross-package signal between the vendor sidebar's Orders nav item
 * (packages/vendor, a composable core route — not a custom `apps/vendor`
 * page) and the app-level messenger notification state (apps/vendor) —
 * packages/vendor cannot import app-level code directly, so both sides
 * depend on this shared singleton instead. Mirrors `supportChatBridge`.
 */
class OrderNotificationBridge {
  private unreadCountListeners = new Set<UnreadCountListener>()
  private markReadRequestListeners = new Set<MarkReadRequestListener>()

  subscribeUnreadCount(listener: UnreadCountListener): () => void {
    this.unreadCountListeners.add(listener)
    return () => {
      this.unreadCountListeners.delete(listener)
    }
  }

  publishUnreadCount(count: number): void {
    for (const listener of this.unreadCountListeners) {
      listener(count)
    }
  }

  subscribeMarkReadRequest(listener: MarkReadRequestListener): () => void {
    this.markReadRequestListeners.add(listener)
    return () => {
      this.markReadRequestListeners.delete(listener)
    }
  }

  /** Called by the sidebar Orders nav item once the seller is on /orders. */
  requestMarkRead(): void {
    for (const listener of this.markReadRequestListeners) {
      listener()
    }
  }
}

export const orderNotificationBridge = new OrderNotificationBridge()
