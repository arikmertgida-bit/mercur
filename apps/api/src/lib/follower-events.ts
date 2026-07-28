import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import type { IEventBusModuleService } from "@medusajs/framework/types"

import { getCatchMessage } from "./errors"
import { resolveKayiLogger } from "./logger"

export enum FollowerNotificationEvent {
  NEW_FOLLOWER = "follower_notification.new_follower",
}

/**
 * Shared messenger `notificationType` / persisted `metadata.notification_type`
 * tag for every follower-related messenger notification — lets the vendor
 * "Takipçiler" unread badge query messages by category instead of relying on
 * the per-conversation chat unread counter.
 */
export const FOLLOWER_NOTIFICATION_TYPE = "follower_notification"

export interface FollowerNewFollowerEventPayload {
  sellerToNotify: string
  customerId: string
  customerName: string
}

export async function emitFollowerNewFollowerEvent(
  container: MedusaContainer,
  payload: FollowerNewFollowerEventPayload
): Promise<void> {
  const logger = resolveKayiLogger(container)

  try {
    const eventBus = container.resolve<IEventBusModuleService>(
      Modules.EVENT_BUS
    )
    await eventBus.emit({ name: FollowerNotificationEvent.NEW_FOLLOWER, data: payload })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[follower-events] Failed to emit ${FollowerNotificationEvent.NEW_FOLLOWER}: ${message}`)
  }
}
