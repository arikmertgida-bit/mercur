import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"
import { anonymizeMessengerUser } from "../lib/messenger"

interface SellerMemberDeletedEventPayload {
  seller_id: string
  seller_member_id: string
}

/**
 * Handles the "seller_member.deleted" event.
 * GDPR/KVKK "right to be forgotten" — anonymizes the message content in
 * kayi-messenger when a seller team member is removed from a store. In the
 * vendor JWT, for actor_type "seller", actor_id = seller_member_id (see
 * messenger/src/middleware/auth.ts resolveIdentity), so that is the real
 * sender identity in messenger — not seller_id.
 * Never blocks the member-removal flow; errors are only logged.
 */
export default async function messengerGdprSellerMemberDeletedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<SellerMemberDeletedEventPayload>): Promise<void> {
  const logger = resolveKayiLogger(container)

  try {
    await anonymizeMessengerUser(data.seller_member_id)
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(`[messenger-gdpr-seller-member-deleted] anonymize failed: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: "seller_member.deleted",
}
