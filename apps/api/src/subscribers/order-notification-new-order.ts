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
import { ORDER_NOTIFICATION_TYPE } from "../lib/order-events"

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

/**
 * Handles `order.placed`. This event is emitted once per per-seller split
 * order (see `complete-cart-with-split-orders.ts`), so each firing already
 * corresponds to exactly one seller — no fan-out needed here.
 */
export default async function orderNotificationNewOrderSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const orderId = data.id
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

    const { data: orderRows } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "customer_id", "email"],
      filters: { id: orderId },
    })
    const order = parseFirstRow(OrderSummaryRowSchema, orderRows)
    if (!order) {
      return
    }

    let customerName = order.email ?? "Bir müşteri"
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

    const preview = `${customerName} size yeni bir sipariş verdi. Sipariş No: #${order.display_id}`

    const notified = order.customer_id
      ? await notifyMessengerUser({
          targetUserId: sellerLink.seller_id,
          targetUserType: "SELLER",
          senderName: customerName,
          preview,
          sourceUserId: order.customer_id,
          sourceUserType: "CUSTOMER",
          subject: "Yeni Sipariş",
          notificationType: ORDER_NOTIFICATION_TYPE,
          metadata: { notification_type: ORDER_NOTIFICATION_TYPE },
        })
      : await notifyMessengerUser({
          // Guest checkout has no real customer id to converse with — falls
          // back to the seller's shared "Destek" (ADMIN_SUPPORT) thread.
          targetUserId: sellerLink.seller_id,
          targetUserType: "SELLER",
          senderName: "Kayı.com",
          preview,
          sourceUserId: ADMIN_SYSTEM_ID,
          sourceUserType: "ADMIN",
          subject: "Yeni Sipariş",
          conversationType: "ADMIN_SUPPORT",
          notificationType: ORDER_NOTIFICATION_TYPE,
          metadata: { notification_type: ORDER_NOTIFICATION_TYPE },
        })

    if (!notified) {
      logger.warn(
        `[order-notification-new-order] Messenger notify was not accepted for order ${orderId}`
      )
    }
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[order-notification-new-order] Failed for order ${orderId}: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
