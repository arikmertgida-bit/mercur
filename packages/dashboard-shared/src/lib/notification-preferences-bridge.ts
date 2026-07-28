type ChangedListener = () => void

/**
 * Cross-package signal between the vendor Store Settings "Bildirim Ayarları"
 * drawer (packages/vendor) and the app-level messenger state (apps/vendor) —
 * packages/vendor cannot import app-level code directly, so both sides
 * depend on this shared singleton instead. Mirrors `supportChatBridge`.
 *
 * Fired after a successful preferences save so `MessengerProvider` can
 * refetch and keep its in-memory copy (used to gate the "Mesajlar" push/toast)
 * in sync without a page reload.
 */
class NotificationPreferencesBridge {
  private changedListeners = new Set<ChangedListener>()

  subscribeChanged(listener: ChangedListener): () => void {
    this.changedListeners.add(listener)
    return () => {
      this.changedListeners.delete(listener)
    }
  }

  publishChanged(): void {
    for (const listener of this.changedListeners) {
      listener()
    }
  }
}

export const notificationPreferencesBridge = new NotificationPreferencesBridge()
