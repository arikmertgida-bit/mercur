import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import type { IEventBusModuleService } from "@medusajs/framework/types"

import { getCatchMessage } from "./errors"
import { resolveKayiLogger } from "./logger"

export enum ReviewNotificationEvent {
  NEW_REVIEW = "review_notification.new_review",
  SELLER_REPLY = "review_notification.seller_reply",
}

/**
 * Shared messenger `notificationType` / persisted `metadata.notification_type`
 * tag for every review-related messenger notification — lets the vendor
 * "Değerlendirmeler" unread badge query messages by category instead of
 * relying on the per-conversation chat unread counter.
 */
export const REVIEW_NOTIFICATION_TYPE = "review_notification"

export interface ReviewNewReviewEventPayload {
  sellerToNotify: string
  customerId: string
  customerName: string
}

export interface ReviewSellerReplyEventPayload {
  reviewId: string
  sellerId: string
  sellerName: string
}

type ReviewEventPayload =
  | ReviewNewReviewEventPayload
  | ReviewSellerReplyEventPayload

async function emitReviewEvent(
  container: MedusaContainer,
  eventName: ReviewNotificationEvent,
  data: ReviewEventPayload
): Promise<void> {
  const logger = resolveKayiLogger(container)

  try {
    const eventBus = container.resolve<IEventBusModuleService>(
      Modules.EVENT_BUS
    )
    await eventBus.emit({ name: eventName, data })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[review-events] Failed to emit ${eventName}: ${message}`)
  }
}

export async function emitReviewNewReviewEvent(
  container: MedusaContainer,
  payload: ReviewNewReviewEventPayload
): Promise<void> {
  await emitReviewEvent(container, ReviewNotificationEvent.NEW_REVIEW, payload)
}

export async function emitReviewSellerReplyEvent(
  container: MedusaContainer,
  payload: ReviewSellerReplyEventPayload
): Promise<void> {
  await emitReviewEvent(container, ReviewNotificationEvent.SELLER_REPLY, payload)
}
