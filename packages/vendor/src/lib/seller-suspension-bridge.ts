type OpenRequestListener = () => void

/**
 * Singleton signal (same shape as `supportChatBridge`) that lets any action
 * across the vendor panel — the Create button, edit/publish, delete — open
 * the single globally-mounted suspended-seller warning Prompt without each
 * call site owning its own dialog state.
 */
class SellerSuspensionBridge {
  private openRequestListeners = new Set<OpenRequestListener>()

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
}

export const sellerSuspensionBridge = new SellerSuspensionBridge()
