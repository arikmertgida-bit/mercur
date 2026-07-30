import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { approveSellerWorkflow } from "@mercurjs/core/workflows"

import { getCatchMessage } from "../lib/errors"
import { resolveKayiLogger } from "../lib/logger"

interface SellerCreatedEventPayload {
  id: string
}

/**
 * Kayı.com does not require manual admin approval in this marketplace: as
 * soon as a new seller record (`seller.created`) is created, `approveSellerWorkflow`
 * fires and the store transitions directly to `open`. Approval never blocks
 * the registration flow — on error it is only logged, the seller stays
 * `pending_approval` and can be approved manually from the admin panel.
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
      `[auto-approve-seller] seller ${data.id} could not be auto-approved: ${message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "seller.created",
}
