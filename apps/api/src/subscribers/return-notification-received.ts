import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { z } from "zod"

import { SellerSummarySchema, parseFirstRow } from "../lib/graph-schemas"
import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../lib/messenger"
import { RETURN_NOTIFICATION_TYPE } from "../lib/return-events"
import {
  NOTIFICATION_MESSAGES,
  interpolateNotification,
  resolveCustomerNotificationLanguage,
} from "../lib/messenger-notification-i18n"

const OrderSellerLinkRowSchema = z.object({
  order_id: z.string(),
  seller_id: z.string(),
})

const OrderSummaryRowSchema = z.object({
  id: z.string(),
  display_id: z.coerce.number(),
  customer_id: z.string().nullable(),
})

/**
 * Handles `OrderWorkflowEvents.RETURN_RECEIVED`, fired once a seller (or
 * admin) confirms a return has physically arrived (`POST
 * .../returns/:id/receive/confirm`). Notifies the customer that their
 * return was received — the vendor's "send notification" switch on that
 * form maps to `no_notification` here, threaded through
 * `confirmReturnReceiveWorkflow`'s emitted event data.
 *
 * Skipped for guest orders (no `customer_id`, so no messenger account to
 * notify) and whenever the seller left the notification switch off.
 */
export default async function returnNotificationReceivedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{
  order_id: string
  return_id: string
  no_notification?: boolean
}>): Promise<void> {
  const { order_id: orderId, return_id: returnId, no_notification } = data
  const logger = resolveKayiLogger(container)

  if (no_notification) {
    return
  }

  try {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { data: orderRows } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "customer_id"],
      filters: { id: orderId },
    })
    const order = parseFirstRow(OrderSummaryRowSchema, orderRows)
    if (!order || !order.customer_id) {
      return
    }

    const { data: sellerLinkRows } = await query.graph({
      entity: "order_seller",
      fields: ["order_id", "seller_id"],
      filters: { order_id: orderId },
    })
    const sellerLink = parseFirstRow(OrderSellerLinkRowSchema, sellerLinkRows)
    if (!sellerLink) {
      return
    }

    const { data: sellerRows } = await query.graph({
      entity: "seller",
      fields: ["id", "name"],
      filters: { id: sellerLink.seller_id },
    })
    const seller = parseFirstRow(SellerSummarySchema, sellerRows)

    const language = await resolveCustomerNotificationLanguage(container, order.customer_id)
    const messages = NOTIFICATION_MESSAGES[language]
    const sellerName = seller?.name ?? messages.genericSellerName

    const preview = interpolateNotification(messages.return.receivedPreview, {
      sellerName,
      displayId: String(order.display_id),
    })

    const notified = await notifyMessengerUser({
      targetUserId: order.customer_id,
      targetUserType: "CUSTOMER",
      senderName: sellerName,
      preview,
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: messages.return.receivedSubject,
      conversationType: "ADMIN_SUPPORT",
      notificationType: RETURN_NOTIFICATION_TYPE,
      metadata: { notification_type: RETURN_NOTIFICATION_TYPE },
    })

    if (!notified) {
      logger.warn(
        `[return-notification-received] Messenger notify was not accepted for return ${returnId}`
      )
    }
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[return-notification-received] Failed for return ${returnId}: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.RETURN_RECEIVED,
}
