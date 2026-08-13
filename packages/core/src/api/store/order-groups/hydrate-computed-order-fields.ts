import { MedusaContainer } from "@medusajs/framework"
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows"

type OrderWithComputedFields = {
  id: string
  fulfillment_status?: string
  payment_status?: string
}

/**
 * `fulfillment_status`/`payment_status` aren't database columns or
 * remote-query-computable fields — native Medusa derives them at request
 * time from an order's `fulfillments`/`payment_collections` (see
 * `getOrderDetailWorkflow`, the same workflow `/store/orders/:id` uses).
 * That aggregation never runs when `order` is reached through the
 * `order_group -> orders` link, so both fields silently come back empty no
 * matter what's requested. This re-runs the same public workflow per order
 * and merges its two computed fields back in place.
 */
export const hydrateComputedOrderFields = async (
  scope: MedusaContainer,
  requestedFields: string[],
  orderGroups: { orders?: OrderWithComputedFields[] | null }[]
): Promise<void> => {
  const needsComputedFields =
    requestedFields.includes("orders.fulfillment_status") ||
    requestedFields.includes("orders.payment_status")

  if (!needsComputedFields) {
    return
  }

  const orders = orderGroups.flatMap((group) => group.orders ?? [])

  await Promise.all(
    orders.map(async (order) => {
      const { result } = await getOrderDetailWorkflow(scope).run({
        input: {
          order_id: order.id,
          fields: ["id"],
        },
      })

      order.fulfillment_status = result.fulfillment_status
      order.payment_status = result.payment_status
    })
  )
}
