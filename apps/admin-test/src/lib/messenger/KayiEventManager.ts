type UnreadCountListener = (count: number) => void

export class KayiEventManager {
  private unreadCountListeners = new Set<UnreadCountListener>()

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
}

export const kayiEventManager = new KayiEventManager()
