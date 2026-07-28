import * as React from "react"
import { useLocation } from "react-router-dom"
import { UserGroup } from "@medusajs/icons"
import {
  getNotificationUnreadCount,
  markNotificationsRead,
} from "../../../lib/messenger/client"
import { getMessengerAuthToken, isTokenExpired } from "../../../lib/messenger/auth-token"
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

  React.useEffect((): (() => void) => {
    const unsubscribe = kayiEventManager.subscribeNotification(FOLLOWER_NOTIFICATION_TYPE, (): void => {
      setUnreadCount((prev) => prev + 1)
    })

    const token = getMessengerAuthToken()
    if (token && !isTokenExpired(token)) {
      getNotificationUnreadCount(FOLLOWER_NOTIFICATION_TYPE)
        .then((r: { count: number }): void => {
          setUnreadCount(r.count ?? 0)
        })
        .catch((err): void => {
          logger.error(
            `Failed to fetch initial follower notification count: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
          )
        })
    }

    return (): void => {
      unsubscribe()
    }
  }, [])

  React.useEffect((): void => {
    const isFollowersRoute =
      location.pathname === "/followers" || location.pathname.endsWith("/followers")
    if (!isFollowersRoute) {
      return
    }
    setUnreadCount(0)
    markNotificationsRead(FOLLOWER_NOTIFICATION_TYPE).catch((err): void => {
      logger.error(
        `Failed to mark follower notifications read: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
      )
    })
  }, [location.pathname])

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
