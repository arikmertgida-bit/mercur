import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { approveSellerWorkflow } from "@mercurjs/core/workflows"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"

interface SellerCreatedEventPayload {
  id: string
}

/**
 * Kayı.com bu pazar yerinde manuel admin onayı istemiyor: yeni satıcı
 * kaydı (`seller.created`) oluşur oluşmaz `approveSellerWorkflow`
 * tetiklenerek mağaza doğrudan `open` durumuna geçer. Onay hiçbir zaman
 * kayıt akışını engellemez — hata durumunda yalnızca loglanır, satıcı
 * `pending_approval` olarak kalır ve admin panelden elle onaylanabilir.
 */
export default async function autoApproveSellerSubscriber({
  event: { data },
  container,
}: SubscriberArgs<SellerCreatedEventPayload>): Promise<void> {
  const logger = resolveKayiLogger(container)

  try {
    await approveSellerWorkflow(container).run({
      input: { seller_id: data.id },
    })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.error(
      `[auto-approve-seller] seller ${data.id} otomatik onaylanamadı: ${message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "seller.created",
}
