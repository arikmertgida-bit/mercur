import * as React from "react"
import { useLocation } from "react-router-dom"
import { ChatBubble } from "@medusajs/icons"
import { getUnreadCount } from "../../../lib/messenger/client"
import { getMessengerAuthToken, isTokenExpired } from "../../../lib/messenger/auth-token"
import { kayiEventManager } from "../../../lib/messenger/KayiEventManager"
import { logger } from "../../../lib/logger"
import { getCatchMessage } from "../../../lib/errors"

const BADGE_CLASSES =
  "pointer-events-none absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ui-tag-red-bg px-0.5 text-[9px] font-semibold tabular-nums text-ui-tag-red-text shadow-sm"

function formatSidebarUnreadCount(count: number): string {
  if (count > 9) {
    return "9+"
  }
  return String(count)
}

export function MessagesIcon(props: { className?: string }): React.JSX.Element {
  const { className } = props
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  const location = useLocation()

  React.useEffect((): (() => void) => {
    const unsubscribe = kayiEventManager.subscribeUnreadCount((count: number): void => {
      setUnreadCount(count)
    })

    const token = getMessengerAuthToken()
    if (token && !isTokenExpired(token)) {
      getUnreadCount()
        .then((r: { count: number }): void => {
          setUnreadCount(r.count ?? 0)
        })
        .catch((err): void => {
          logger.error(
            `Failed to fetch initial unread count: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
          )
        })
    }

    return (): void => {
      unsubscribe()
    }
  }, [])

  React.useEffect((): void => {
    const isMessagesRoute =
      location.pathname === "/messages" || location.pathname.endsWith("/messages")
    if (isMessagesRoute) {
      setUnreadCount(0)
    }
  }, [location.pathname])

  const safeUnreadCount = unreadCount ?? 0
  const badgeLabel = formatSidebarUnreadCount(safeUnreadCount)

  return (
    <span className="relative inline-flex">
      <ChatBubble className={className} />
      {safeUnreadCount > 0 && (
        <span className={BADGE_CLASSES} aria-hidden="true">
          {badgeLabel}
        </span>
      )}
    </span>
  )
}
