import { useEffect, useRef, type RefObject } from "react"
import type { Message } from "../lib/messenger/types"

/**
 * Distance (px) considered "near the bottom". While the user is within this
 * range, an incoming message auto-scrolls to the bottom; if they've scrolled
 * up to read history, auto-scroll won't disturb them.
 */
const NEAR_BOTTOM_THRESHOLD_PX = 80

/**
 * Scrolls the message list to the bottom — only (a) when a different
 * conversation is opened (`conversationKey` changes, always scrolls to
 * bottom), or (b) when a new message arrives in the same conversation AND the
 * user is already near the bottom. Deliberately NOT dependent on
 * `typingUserIds`: the other side starting/stopping typing produced a new
 * array reference on every change, which forced a scroll to bottom even while
 * the user was reading history.
 *
 * `container.scrollTop` is assigned directly — `Element.scrollIntoView()` was
 * not used because, by definition, it can target the nearest scrollable
 * ancestor (the page itself if CSS containment is broken); direct assignment
 * eliminates that risk entirely.
 */
export function useMessengerAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  messages: Message[],
  conversationKey: string | null
): void {
  const previousConversationKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isNewConversation = conversationKey !== previousConversationKeyRef.current
    previousConversationKeyRef.current = conversationKey

    if (!isNewConversation) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceFromBottom > NEAR_BOTTOM_THRESHOLD_PX) return
    }

    const frameId = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
    return () => cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, conversationKey])
}
