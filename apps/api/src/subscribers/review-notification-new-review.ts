import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { notifyMessengerUser } from "../lib/messenger"
import {
  REVIEW_NOTIFICATION_TYPE,
  ReviewNotificationEvent,
  type ReviewNewReviewEventPayload,
} from "../lib/review-events"

/**
 * Handles the "review_notification.new_review" event.
 * Notifies the seller in real-time when a customer submits a new review.
 */
export default async function reviewNotificationNewReviewSubscriber({
  event: { data },
  container,
}: SubscriberArgs<ReviewNewReviewEventPayload>): Promise<void> {
  const { sellerToNotify, customerId, customerName } = data
  const logger = resolveKayiLogger(container)

  try {
    await notifyMessengerUser({
      targetUserId: sellerToNotify,
      targetUserType: "SELLER",
      senderName: customerName,
      preview: `${customerName} ürününüze yeni bir yorum bıraktı.`,
      sourceUserId: customerId,
      sourceUserType: "CUSTOMER",
      subject: "Yeni Değerlendirme",
      notificationType: REVIEW_NOTIFICATION_TYPE,
      metadata: { notification_type: REVIEW_NOTIFICATION_TYPE },
    })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[review-notification-new-review] Messenger notify failed: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: ReviewNotificationEvent.NEW_REVIEW,
}
