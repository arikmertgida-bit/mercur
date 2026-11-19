type UnreadCountListener = (count: number) => void
type NotificationListener = () => void
type SessionListener = (sellerId: string | null) => void

export class KayiEventManager {
  private unreadCountListeners = new Set<UnreadCountListener>()
  private notificationListeners = new Map<string, Set<NotificationListener>>()
  private sessionSellerId: string | null = null
  private sessionListeners = new Set<SessionListener>()

  /**
   * The seller whose messenger token is in localStorage right now, set by
   * MessengerProvider only after it checked (or fetched) the token for the
   * active store. Sidebar badges wait for it: reading localStorage directly on
   * mount sent the previous store's token after a store switch, so the new
   * store showed (and marked read) the old store's counts.
   */
  public getSessionSellerId(): string | null {
    return this.sessionSellerId
  }

  public subscribeSession(listener: SessionListener): () => void {
    this.sessionListeners.add(listener)
    return () => {
      this.sessionListeners.delete(listener)
    }
  }

  public setSessionSellerId(sellerId: string | null): void {
    if (this.sessionSellerId === sellerId) {
      return
    }
    this.sessionSellerId = sellerId
    for (const listener of this.sessionListeners) {
      listener(sellerId)
    }
  }

  public subscribeUnreadCount(listener: UnreadCountListener): () => void {
    this.unreadCountListeners.add(listener)
    return () => {
      this.unreadCountListeners.delete(listener)
    }
  }

  public emitUnreadCount(count: number): void {
    for (const listener of this.unreadCountListeners) {
      listener(count)
    }
  }

  /**
   * Fired whenever a live messenger "notification" socket event arrives for
   * the given category (`REVIEW_NOTIFICATION_TYPE`, `ORDER_NOTIFICATION_TYPE`,
   * `REQUEST_NOTIFICATION_TYPE`, `FOLLOWER_NOTIFICATION_TYPE`, ...). Category
   * strings must match the backend's `notification_type` tag exactly.
   */
  public subscribeNotification(type: string, listener: NotificationListener): () => void {
    let listeners = this.notificationListeners.get(type)
    if (!listeners) {
      listeners = new Set()
      this.notificationListeners.set(type, listeners)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  public emitNotification(type: string): void {
    const listeners = this.notificationListeners.get(type)
    if (!listeners) {
      return
    }
    for (const listener of listeners) {
      listener()
    }
  }
}

export const kayiEventManager = new KayiEventManager()
