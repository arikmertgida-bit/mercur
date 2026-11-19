import * as React from "react"
import { orderNotificationBridge } from "@mercurjs/dashboard-shared"
import { getNotificationUnreadCount, markNotificationsRead } from "./client"
import { kayiEventManager } from "./KayiEventManager"
import { useMessengerSession } from "./use-messenger-session"
import { ORDER_NOTIFICATION_TYPE } from "./types"
import { logger } from "../logger"
import { getCatchMessage } from "../errors"

/**
 * Feeds `orderNotificationBridge` from app-level messenger state so the
 * Orders nav item's badge (rendered by `packages/vendor`'s composable
 * core routes, which cannot import this app's messenger client directly)
 * stays in sync. Mounted once in `MessengerVendorBootstrap`; renders nothing.
 */
export function OrdersBadgeBridge(): null {
  const unreadCountRef = React.useRef<number>(0)
  const sessionSellerId = useMessengerSession()

  React.useEffect((): (() => void) => {
    const applyCount = (count: number): void => {
      unreadCountRef.current = count
      orderNotificationBridge.publishUnreadCount(count)
    }

    const unsubscribeNotification = kayiEventManager.subscribeNotification(
      ORDER_NOTIFICATION_TYPE,
      (): void => {
        applyCount(unreadCountRef.current + 1)
      },
    )

    const unsubscribeMarkRead = orderNotificationBridge.subscribeMarkReadRequest((): void => {
      applyCount(0)
      // The stored token may still be the previous store's right after a switch.
      if (!kayiEventManager.getSessionSellerId()) {
        return
      }
      markNotificationsRead(ORDER_NOTIFICATION_TYPE).catch((err): void => {
        logger.error(
          `Failed to mark order notifications read: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
        )
      })
    })

    return (): void => {
      unsubscribeNotification()
      unsubscribeMarkRead()
    }
  }, [])

  // Read only once the messenger token belongs to the active store, and again
  // after every store switch (the previous store's count must not linger).
  React.useEffect((): (() => void) | undefined => {
    if (!sessionSellerId) {
      unreadCountRef.current = 0
      orderNotificationBridge.publishUnreadCount(0)
      return undefined
    }
    let cancelled = false
    getNotificationUnreadCount(ORDER_NOTIFICATION_TYPE)
      .then((r: { count: number }): void => {
        if (!cancelled) {
          unreadCountRef.current = r.count ?? 0
          orderNotificationBridge.publishUnreadCount(unreadCountRef.current)
        }
      })
      .catch((err): void => {
        logger.error(
          `Failed to fetch order notification count: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
        )
      })
    return (): void => {
      cancelled = true
    }
  }, [sessionSellerId])

  return null
}
