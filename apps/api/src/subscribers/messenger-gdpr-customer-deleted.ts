import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { anonymizeMessengerUser } from "../lib/messenger"

interface CustomerDeletedEventPayload {
  id: string
}

/**
 * Handles the "customer.deleted" event.
 * GDPR/KVKK "right to be forgotten" — anonymizes all of the customer's
 * message content in kayi-messenger when their account is deleted. Never
 * blocks the customer-deletion flow; errors are only logged.
 */
export default async function messengerGdprCustomerDeletedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<CustomerDeletedEventPayload>): Promise<void> {
  const logger = resolveKayiLogger(container)

  try {
    await anonymizeMessengerUser(data.id)
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[messenger-gdpr-customer-deleted] anonymize failed: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: "customer.deleted",
}
