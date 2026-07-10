type OpenRequestListener = () => void
type UnreadCountListener = (count: number) => void

/**
 * Cross-package signal between the vendor sidebar's Support menu item
 * (packages/vendor) and the app-level admin-support chat drawer
 * (apps/vendor) — packages/vendor cannot import app-level code directly,
 * so both sides depend on this shared singleton instead.
 */
class SupportChatBridge {
  private openRequestListeners = new Set<OpenRequestListener>()
  private unreadCountListeners = new Set<UnreadCountListener>()

  subscribeOpenRequest(listener: OpenRequestListener): () => void {
    this.openRequestListeners.add(listener)
    return () => {
      this.openRequestListeners.delete(listener)
    }
  }

  requestOpen(): void {
    for (const listener of this.openRequestListeners) {
      listener()
    }
  }

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
}

export const supportChatBridge = new SupportChatBridge()
