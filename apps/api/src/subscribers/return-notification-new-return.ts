import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { z } from "zod"

import {
  CustomerSummarySchema,
  buildCustomerDisplayName,
  parseFirstRow,
  parseRows,
} from "../lib/graph-schemas"
import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../lib/messenger"
import { RETURN_NOTIFICATION_TYPE } from "../lib/return-events"
import {
  NOTIFICATION_MESSAGES,
  interpolateNotification,
  resolveSellerNotificationLanguage,
} from "../lib/messenger-notification-i18n"

const OrderSellerLinkRowSchema = z.object({
  order_id: z.string(),
  seller_id: z.string(),
})

const OrderSummaryRowSchema = z.object({
  id: z.string(),
  display_id: z.coerce.number(),
  customer_id: z.string().nullable(),
  email: z.string().nullable(),
})

const ReturnSummaryRowSchema = z.object({
  id: z.string(),
  created_by: z.string().nullable(),
})

/**
 * Handles `OrderWorkflowEvents.RETURN_REQUESTED`. Fires for both a
 * customer-initiated return (`/store/returns`) and a seller-initiated one
 * (`/vendor/returns`) — skips notifying when the seller themselves is the
 * one who created the return, since they already know about it.
 */
export default async function returnNotificationNewReturnSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; return_id: string }>): Promise<void> {
  const { order_id: orderId, return_id: returnId } = data
  const logger = resolveKayiLogger(container)

  try {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { data: sellerLinkRows } = await query.graph({
      entity: "order_seller",
      fields: ["order_id", "seller_id"],
      filters: { order_id: orderId },
    })
    const sellerLink = parseRows(OrderSellerLinkRowSchema, sellerLinkRows)[0]
    if (!sellerLink) {
      return
    }

    const { data: returnRows } = await query.graph({
      entity: "return",
      fields: ["id", "created_by"],
      filters: { id: returnId },
    })
    const returnData = parseFirstRow(ReturnSummaryRowSchema, returnRows)
    if (!returnData || returnData.created_by === sellerLink.seller_id) {
      return
    }

    const { data: orderRows } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "customer_id", "email"],
      filters: { id: orderId },
    })
    const order = parseFirstRow(OrderSummaryRowSchema, orderRows)
    if (!order) {
      return
    }

    const language = await resolveSellerNotificationLanguage(container, sellerLink.seller_id)
    const messages = NOTIFICATION_MESSAGES[language]

    let customerName = order.email ?? messages.genericCustomerName
    if (order.customer_id) {
      const { data: customerRows } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name", "email"],
        filters: { id: order.customer_id },
      })
      const customer = parseFirstRow(CustomerSummarySchema, customerRows)
      if (customer) {
        customerName = buildCustomerDisplayName(customer)
      }
    }

    const preview = interpolateNotification(messages.return.preview, {
      customerName,
      displayId: String(order.display_id),
    })

    const notified = order.customer_id
      ? await notifyMessengerUser({
          targetUserId: sellerLink.seller_id,
          targetUserType: "SELLER",
          senderName: customerName,
          preview,
          sourceUserId: order.customer_id,
          sourceUserType: "CUSTOMER",
          subject: messages.return.subject,
          notificationType: RETURN_NOTIFICATION_TYPE,
          metadata: { notification_type: RETURN_NOTIFICATION_TYPE },
        })
      : await notifyMessengerUser({
          // Guest checkout has no real customer id to converse with — falls
          // back to the seller's shared admin-support thread.
          targetUserId: sellerLink.seller_id,
          targetUserType: "SELLER",
          senderName: "Kayı.com",
          preview,
          sourceUserId: ADMIN_SYSTEM_ID,
          sourceUserType: "ADMIN",
          subject: messages.return.subject,
          conversationType: "ADMIN_SUPPORT",
          notificationType: RETURN_NOTIFICATION_TYPE,
          metadata: { notification_type: RETURN_NOTIFICATION_TYPE },
        })

    if (!notified) {
      logger.warn(
        `[return-notification-new-return] Messenger notify was not accepted for return ${returnId}`
      )
    }
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[return-notification-new-return] Failed for return ${returnId}: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.RETURN_REQUESTED,
}
