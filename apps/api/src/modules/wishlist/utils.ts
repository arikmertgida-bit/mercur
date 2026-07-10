import type { MedusaContainer, Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import customerWishlist from "../../links/customer-wishlist"

export type CustomerWishlistLookup = {
  id: string
}

/**
 * Resolves the current customer's wishlist id via Remote Query over the
 * customer-wishlist link. Deliberately avoids raw SQL / direct DB access.
 */
export async function getWishlistFromCustomerId(
  container: MedusaContainer,
  customerId: string
): Promise<CustomerWishlistLookup | null> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const {
    data: [row],
  } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: ["wishlist.id"],
    filters: { customer_id: customerId },
  })

  if (!row?.wishlist) {
    return null
  }

  return { id: row.wishlist.id }
}
