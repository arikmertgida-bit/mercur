type UnreadCountListener = (count: number) => void
type NotificationListener = () => void

export class KayiEventManager {
  private unreadCountListeners = new Set<UnreadCountListener>()
  private notificationListeners = new Map<string, Set<NotificationListener>>()

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
