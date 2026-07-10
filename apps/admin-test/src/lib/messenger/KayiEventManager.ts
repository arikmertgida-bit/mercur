type UnreadCountListener = (count: number) => void
type MessagesVisitedListener = () => void

export class KayiEventManager {
  private unreadCountListeners = new Set<UnreadCountListener>()
  private messagesVisitedListeners = new Set<MessagesVisitedListener>()

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

  public subscribeMessagesVisited(listener: MessagesVisitedListener): () => void {
    this.messagesVisitedListeners.add(listener)
    return () => {
      this.messagesVisitedListeners.delete(listener)
    }
  }

  public emitMessagesVisited(): void {
    for (const listener of this.messagesVisitedListeners) {
      listener()
    }
  }
}

export const kayiEventManager = new KayiEventManager()
