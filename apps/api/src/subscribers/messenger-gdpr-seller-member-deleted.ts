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
 * GDPR/KVKK "unutulma hakkı" — bir satıcı ekip üyesi (member) mağazadan
 * kaldırıldığında kayi-messenger'daki mesaj içeriğini anonimleştirir.
 * Vendor JWT'sinde actor_type "seller" için actor_id = seller_member_id
 * (bkz. messenger/src/middleware/auth.ts resolveIdentity), bu yüzden
 * messenger'daki gerçek gönderici kimliği budur — seller_id değil.
 * Üye kaldırma akışını asla engellemez; hata durumunda yalnızca loglanır.
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
