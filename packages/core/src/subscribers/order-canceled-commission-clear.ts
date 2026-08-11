import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { clearOrderCommissionLinesWorkflow } from "../workflows/commission/workflows/clear-order-commission-lines"

/**
 * A canceled order means the customer kept nothing, so its commission
 * lines are deleted rather than recomputed — the counterpart to
 * order-edit-confirmed.ts's "track what the customer actually kept" for
 * the terminal all-of-it case, which that recompute-based handler can't
 * express (recomputing from the order's still-present items would just
 * reproduce the pre-cancel amount).
 */
export default async function orderCanceledCommissionClearHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id

  if (!orderId) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await clearOrderCommissionLinesWorkflow(container).run({
      input: { order_ids: [orderId] },
    })
  } catch (error) {
    // Log only, do not rethrow: an uncaught subscriber error loses the event.
    logger.error(
      `Commission clear failed for canceled order ${orderId}:`,
      error as Error
    )
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.CANCELED,
  context: {
    subscriberId: "order-canceled-commission-clear-handler",
  },
}
