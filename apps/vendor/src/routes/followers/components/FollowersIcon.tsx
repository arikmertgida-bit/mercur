import * as React from "react"
import { useLocation } from "react-router-dom"
import { UserGroup } from "@medusajs/icons"
import {
  getNotificationUnreadCount,
  markNotificationsRead,
} from "../../../lib/messenger/client"
import { useMessengerSession } from "../../../lib/messenger/use-messenger-session"
import { kayiEventManager } from "../../../lib/messenger/KayiEventManager"
import { FOLLOWER_NOTIFICATION_TYPE } from "../../../lib/messenger/types"
import { logger } from "../../../lib/logger"
import { getCatchMessage } from "../../../lib/errors"

const BADGE_CLASSES =
  "pointer-events-none absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-semibold tabular-nums text-white shadow-sm"

function formatSidebarUnreadCount(count: number): string {
  if (count > 9) {
    return "9+"
  }
  return String(count)
}

export function FollowersIcon(props: { className?: string }): React.JSX.Element {
  const { className } = props
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  const location = useLocation()

  const sessionSellerId = useMessengerSession()
  const isFollowersRoute =
    location.pathname === "/followers" || location.pathname.endsWith("/followers")

  // Cleared while rendering (not in an effect) whenever the store session ends
  // or the page is opened.
  const [badgeKey, setBadgeKey] = React.useState({ sessionSellerId, isFollowersRoute })
  if (badgeKey.sessionSellerId !== sessionSellerId || badgeKey.isFollowersRoute !== isFollowersRoute) {
    setBadgeKey({ sessionSellerId, isFollowersRoute })
    if (!sessionSellerId || isFollowersRoute) {
      setUnreadCount(0)
    }
  }

  React.useEffect(
    (): (() => void) =>
      kayiEventManager.subscribeNotification(FOLLOWER_NOTIFICATION_TYPE, (): void => {
        setUnreadCount((prev) => prev + 1)
      }),
    [],
  )

  // Counts are read (and cleared on this page) only once the messenger token
  // belongs to the active store, and again after every store switch.
  React.useEffect((): (() => void) | undefined => {
    if (!sessionSellerId) {
      return undefined
    }
    if (isFollowersRoute) {
      markNotificationsRead(FOLLOWER_NOTIFICATION_TYPE).catch((err): void => {
        logger.error(
          `Failed to mark follower notifications read: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
        )
      })
      return undefined
    }
    let cancelled = false
    getNotificationUnreadCount(FOLLOWER_NOTIFICATION_TYPE)
      .then((r: { count: number }): void => {
        if (!cancelled) {
          setUnreadCount(r.count ?? 0)
        }
      })
      .catch((err): void => {
        logger.error(
          `Failed to fetch follower notification count: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
        )
      })
    return (): void => {
      cancelled = true
    }
  }, [sessionSellerId, isFollowersRoute])

  const safeUnreadCount = unreadCount ?? 0
  const badgeLabel = formatSidebarUnreadCount(safeUnreadCount)

  return (
    <span className="relative inline-flex">
      <UserGroup className={className} />
      {safeUnreadCount > 0 && (
        <span className={BADGE_CLASSES} aria-hidden="true">
          {badgeLabel}
        </span>
      )}
    </span>
  )
}
