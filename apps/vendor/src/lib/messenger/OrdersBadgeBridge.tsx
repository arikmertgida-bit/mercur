import * as React from "react"
import { orderNotificationBridge } from "@mercurjs/dashboard-shared"
import { getNotificationUnreadCount, markNotificationsRead } from "./client"
import { getMessengerAuthToken, isTokenExpired } from "./auth-token"
import { kayiEventManager } from "./KayiEventManager"
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
      const markReadToken = getMessengerAuthToken()
      if (!markReadToken || isTokenExpired(markReadToken)) {
        return
      }
      markNotificationsRead(ORDER_NOTIFICATION_TYPE).catch((err): void => {
        logger.error(
          `Failed to mark order notifications read: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
        )
      })
    })

    const token = getMessengerAuthToken()
    if (token && !isTokenExpired(token)) {
      getNotificationUnreadCount(ORDER_NOTIFICATION_TYPE)
        .then((r: { count: number }): void => {
          applyCount(r.count ?? 0)
        })
        .catch((err): void => {
          logger.error(
            `Failed to fetch initial order notification count: ${getCatchMessage(err instanceof Error ? err : undefined)}`,
          )
        })
    }

    return (): void => {
      unsubscribeNotification()
      unsubscribeMarkRead()
    }
  }, [])

  return null
}
