import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { notifyMessengerUser } from "../lib/messenger"
import {
  FOLLOWER_NOTIFICATION_TYPE,
  FollowerNotificationEvent,
  type FollowerNewFollowerEventPayload,
} from "../lib/follower-events"

/**
 * Handles "follower_notification.new_follower".
 * Notifies the seller in real-time when a customer starts following their store.
 */
export default async function followerNotificationNewFollowerSubscriber({
  event: { data },
  container,
}: SubscriberArgs<FollowerNewFollowerEventPayload>): Promise<void> {
  const { sellerToNotify, customerId, customerName } = data
  const logger = resolveKayiLogger(container)

  try {
    await notifyMessengerUser({
      targetUserId: sellerToNotify,
      targetUserType: "SELLER",
      senderName: customerName,
      preview: `${customerName} sizi takip etmeye başladı.`,
      sourceUserId: customerId,
      sourceUserType: "CUSTOMER",
      subject: "Yeni Takipçi",
      notificationType: FOLLOWER_NOTIFICATION_TYPE,
      metadata: { notification_type: FOLLOWER_NOTIFICATION_TYPE },
    })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[follower-notification-new-follower] Messenger notify failed: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: FollowerNotificationEvent.NEW_FOLLOWER,
}
