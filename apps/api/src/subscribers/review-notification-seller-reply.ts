import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Query } from "@medusajs/framework"
import { z } from "zod"

import customerReview from "../links/customer-review"
import { getCatchMessage } from "../lib/errors"
import {
  CustomerReviewSellerRowSchema,
  JsonRecord,
  ProductDetailRowSchema,
  parseFirstRow,
} from "../lib/graph-schemas"
import { resolveKayiLogger } from "../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../lib/messenger"
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

const ReviewReferenceRowSchema = z.object({
  id: z.string(),
  reference: z.enum(["product", "seller"]),
  reference_id: z.string().nullable().optional(),
})

/**
 * Handles the "review_notification.seller_reply" event. Notifies only the
 * customer (the recipient of the reply) — the seller, who just performed
 * this action themselves, has no need to see it reflected back at them.
 * Routed through the customer's one-way admin-support thread (not a DIRECT
 * conversation with the seller) so the seller never becomes a participant
 * of this notification and can't see it in their own inbox. Enriched with
 * a product-context card when the review is about a product — reuses the
 * storefront's existing `ProductContextCard` mechanism via
 * `Conversation.productId`/`metadata`, no storefront render changes needed.
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
    const customerId = parsedLink.data.customer_id

    const { data: reviewRows } = await query.graph({
      entity: "review",
      fields: ["id", "reference", "reference_id"],
      filters: { id: reviewId },
    })
    const review = parseFirstRow(ReviewReferenceRowSchema, reviewRows)

    let conversationProductId: string | undefined
    let conversationMetadata: JsonRecord | undefined

    if (review?.reference === "product" && review.reference_id) {
      const { data: productRows } = await query.graph({
        entity: "product",
        fields: ["id", "title", "handle", "thumbnail", "status"],
        filters: { id: review.reference_id },
      })
      const product = parseFirstRow(ProductDetailRowSchema, productRows)

      if (product) {
        const { data: sellerRows } = await query.graph({
          entity: "seller",
          fields: ["id", "name", "handle", "logo"],
          filters: { id: sellerId },
        })
        const sellerRow = parseFirstRow(CustomerReviewSellerRowSchema, sellerRows)

        conversationProductId = product.id
        conversationMetadata = {
          type: "product",
          product_id: product.id,
          product_name: product.title,
          product_image: product.thumbnail,
          product_handle: product.handle,
          ...(sellerRow
            ? {
                store_id: sellerRow.id,
                store_name: sellerRow.name,
                store_image: sellerRow.logo ?? null,
                store_handle: sellerRow.handle,
              }
            : {}),
        }
      }
    }

    const customerLanguage = await resolveCustomerNotificationLanguage(container, customerId)
    const customerMessages = NOTIFICATION_MESSAGES[customerLanguage]
    const resolvedSellerName = sellerName ?? customerMessages.genericSellerName

    await notifyMessengerUser({
      targetUserId: customerId,
      targetUserType: "CUSTOMER",
      senderName: resolvedSellerName,
      preview: interpolateNotification(customerMessages.review.replyPreview, {
        sellerName: resolvedSellerName,
      }),
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: customerMessages.review.replySubject,
      conversationType: "ADMIN_SUPPORT",
      notificationType: REVIEW_NOTIFICATION_TYPE,
      metadata: { notification_type: REVIEW_NOTIFICATION_TYPE },
      productId: conversationProductId,
      conversationMetadata,
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
