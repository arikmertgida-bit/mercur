import { AdminOrder, AdminOrderLineItem, HttpTypes } from "@medusajs/types"

export const getPaymentsFromOrder = (order: HttpTypes.AdminOrder) => {
  return order.payment_collections
    .map((collection: HttpTypes.AdminPaymentCollection) => collection.payments)
    .flat(1)
    .filter(Boolean) as HttpTypes.AdminPayment[]
}

/**
 * Returns a limit for number of reservations that order can have.
 *
 * A variant can be linked to more than one inventory item (bundles), each
 * contributing its own reservation row. Undercounting here truncates the
 * reservations query and leaves freshly-allocated items showing as "Not
 * allocated" (MER-187).
 */
export function getReservationsLimitCount(order: AdminOrder) {
  if (!order?.items?.length) {
    return 0
  }

  return order.items.reduce((acc: number, item: AdminOrderLineItem) => {
    const variantInventoryCount = item.variant?.inventory_items?.length

    return acc + (variantInventoryCount || 1)
  }, 0)
}
