import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PayoutStatus } from "@mercurjs/types"
import { z } from "zod"

import { parseFirstRow } from "../lib/graph-schemas"
import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../lib/messenger"
import { PAYOUT_NOTIFICATION_TYPE } from "../lib/payout-events"
import {
  NOTIFICATION_MESSAGES,
  interpolateNotification,
  resolveSellerNotificationLanguage,
} from "../lib/messenger-notification-i18n"

const PayoutSummaryRowSchema = z.object({
  id: z.string(),
  display_id: z.coerce.number(),
  status: z.string(),
  amount: z.coerce.number(),
  currency_code: z.string(),
  seller: z.object({ id: z.string() }).nullable(),
})

/**
 * Handles `payout.updated` (auto-emitted by the payout module's generated
 * `updatePayouts` call). Fires on every status transition — only notifies
 * the seller once the payout has actually reached `paid`. There is no real
 * "customer" counterpart for a payout, so — like review-report/resolve and
 * request accept/reject — the notification lands in the seller's shared
 * admin-support thread via `ADMIN_SYSTEM_ID`.
 */
export default async function payoutNotificationCompletedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const payoutId = data.id
  const logger = resolveKayiLogger(container)

  try {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { data: rows } = await query.graph({
      entity: "payout",
      fields: [
        "id",
        "display_id",
        "status",
        "amount",
        "currency_code",
        "seller.id",
      ],
      filters: { id: payoutId },
    })
    const payout = parseFirstRow(PayoutSummaryRowSchema, rows)
    if (!payout || payout.status !== PayoutStatus.PAID || !payout.seller) {
      return
    }

    const language = await resolveSellerNotificationLanguage(container, payout.seller.id)
    const messages = NOTIFICATION_MESSAGES[language]

    const preview = interpolateNotification(messages.payout.preview, {
      displayId: String(payout.display_id),
      amount: String(payout.amount),
      currency: payout.currency_code.toUpperCase(),
    })

    const notified = await notifyMessengerUser({
      targetUserId: payout.seller.id,
      targetUserType: "SELLER",
      senderName: "Kayı.com",
      preview,
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: messages.payout.subject,
      conversationType: "ADMIN_SUPPORT",
      notificationType: PAYOUT_NOTIFICATION_TYPE,
      metadata: { notification_type: PAYOUT_NOTIFICATION_TYPE },
    })

    if (!notified) {
      logger.warn(
        `[payout-notification-completed] Messenger notify was not accepted for payout ${payoutId}`
      )
    }
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[payout-notification-completed] Failed for payout ${payoutId}: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: "payout.updated",
}
