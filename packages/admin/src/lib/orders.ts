import { AdminOrder, AdminOrderLineItem, HttpTypes } from "@medusajs/types"
import { z } from "zod"

// Mercur's seller link is not part of Medusa's AdminOrder type; the order
// detail fields select it (`*seller`), so it is read from the response.
const OrderSellerSchema = z.object({
  seller: z.object({ id: z.string().nullish() }).nullish(),
})

export const getOrderSellerId = (
  order: HttpTypes.AdminOrder
): string | undefined => {
  const parsed = OrderSellerSchema.safeParse(order)

  return parsed.success ? (parsed.data.seller?.id ?? undefined) : undefined
}

export const getPaymentsFromOrder = (order: HttpTypes.AdminOrder) => {
  return order.payment_collections.flatMap(
    (collection: HttpTypes.AdminPaymentCollection) => collection.payments ?? []
  )
}

/**
 * Returns a limit for number of reservations that order can have.
 */
export function getReservationsLimitCount(order: AdminOrder) {
  if (!order?.items?.length) {
    return 0
  }

  return order.items.reduce(
    (acc: number, item: AdminOrderLineItem) =>
      acc + (item.variant?.inventory_items?.length || 1),
    0
  )
}
