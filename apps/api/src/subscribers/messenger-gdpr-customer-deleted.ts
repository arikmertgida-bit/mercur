import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { anonymizeMessengerUser } from "../lib/messenger"

interface CustomerDeletedEventPayload {
  id: string
}

/**
 * Handles the "customer.deleted" event.
 * GDPR/KVKK "unutulma hakkı" — bir müşteri hesabı silindiğinde kayi-messenger'daki
 * tüm mesaj içeriğini anonimleştirir. Müşteri silme akışını asla engellemez;
 * hata durumunda yalnızca loglanır.
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
