import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Query } from "@medusajs/framework"
import { z } from "zod"

import customerReview from "../links/customer-review"
import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { notifyMessengerUser } from "../lib/messenger"
import {
  REVIEW_NOTIFICATION_TYPE,
  ReviewNotificationEvent,
  type ReviewSellerReplyEventPayload,
} from "../lib/review-events"
import {
  NOTIFICATION_MESSAGES,
  interpolateNotification,
  resolveCustomerNotificationLanguage,
} from "../lib/messenger-notification-i18n"

const CustomerReviewLinkSchema = z.object({
  customer_id: z.string(),
})

/**
 * Handles the "review_notification.seller_reply" event.
 * Notifies the customer when a seller replies to their review (seller_note).
 */
export default async function reviewNotificationSellerReplySubscriber({
  event: { data },
  container,
}: SubscriberArgs<ReviewSellerReplyEventPayload>): Promise<void> {
  const { reviewId, sellerId, sellerName } = data
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const logger = resolveKayiLogger(container)

  try {
    const { data: links } = await query.graph({
      entity: customerReview.entryPoint,
      fields: ["customer_id"],
      filters: { review_id: reviewId },
    })

    if (!Array.isArray(links) || links.length === 0) {
      return
    }

    const parsedLink = CustomerReviewLinkSchema.safeParse(links[0])
    if (!parsedLink.success) {
      return
    }

    const language = await resolveCustomerNotificationLanguage(
      container,
      parsedLink.data.customer_id
    )
    const messages = NOTIFICATION_MESSAGES[language]
    const resolvedSellerName = sellerName ?? messages.genericSellerName

    await notifyMessengerUser({
      targetUserId: parsedLink.data.customer_id,
      targetUserType: "CUSTOMER",
      senderName: resolvedSellerName,
      preview: interpolateNotification(messages.review.replyPreview, {
        sellerName: resolvedSellerName,
      }),
      sourceUserId: sellerId,
      sourceUserType: "SELLER",
      subject: messages.review.replySubject,
      notificationType: REVIEW_NOTIFICATION_TYPE,
      metadata: { notification_type: REVIEW_NOTIFICATION_TYPE },
    })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(
      `[review-notification-seller-reply] Could not resolve customer for reply notification: ${message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ReviewNotificationEvent.SELLER_REPLY,
}
