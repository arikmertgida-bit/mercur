import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../lib/messenger"
import {
  FOLLOWER_NOTIFICATION_TYPE,
  FollowerNotificationEvent,
  type FollowerNewFollowerEventPayload,
} from "../lib/follower-events"
import {
  NOTIFICATION_MESSAGES,
  interpolateNotification,
  resolveSellerNotificationLanguage,
} from "../lib/messenger-notification-i18n"

/**
 * Handles "follower_notification.new_follower".
 * Notifies the seller in real-time when a customer starts following their store.
 */
export default async function followerNotificationNewFollowerSubscriber({
  event: { data },
  container,
}: SubscriberArgs<FollowerNewFollowerEventPayload>): Promise<void> {
  const { sellerToNotify, customerName } = data
  const logger = resolveKayiLogger(container)

  try {
    const language = await resolveSellerNotificationLanguage(container, sellerToNotify)
    const messages = NOTIFICATION_MESSAGES[language]
    const resolvedCustomerName = customerName ?? messages.genericCustomerName

    // Routed through the seller's one-way admin-support thread (not a
    // DIRECT conversation with the customer) so the customer — who has no
    // reason to see "you started following this store" reflected back at
    // them — never becomes a participant of this notification.
    await notifyMessengerUser({
      targetUserId: sellerToNotify,
      targetUserType: "SELLER",
      senderName: resolvedCustomerName,
      preview: interpolateNotification(messages.follower.preview, {
        customerName: resolvedCustomerName,
      }),
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: messages.follower.subject,
      conversationType: "ADMIN_SUPPORT",
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
