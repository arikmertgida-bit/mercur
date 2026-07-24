type UnreadCountListener = (count: number) => void
type ReviewNotificationListener = () => void

export class KayiEventManager {
  private unreadCountListeners = new Set<UnreadCountListener>()
  private reviewNotificationListeners = new Set<ReviewNotificationListener>()

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

  /** Fired whenever a live "review_notification" socket event arrives (new review, seller reply, report resolution). */
  public subscribeReviewNotification(listener: ReviewNotificationListener): () => void {
    this.reviewNotificationListeners.add(listener)
    return () => {
      this.reviewNotificationListeners.delete(listener)
    }
  }

  public emitReviewNotification(): void {
    for (const listener of this.reviewNotificationListeners) {
      listener()
    }
  }
}

export const kayiEventManager = new KayiEventManager()
