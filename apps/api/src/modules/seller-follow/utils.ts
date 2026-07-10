import type { MedusaContainer, Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import customerSellerFollow from "../../links/customer-seller-follow"
import sellerFollowLink from "../../links/seller-follow-link"

export type SellerFollowRecord = {
  id: string
}

/**
 * Resolves the seller-follower row (if any) linking a customer to a seller,
 * via Remote Query over both link definitions. No raw SQL / direct DB access.
 */
export async function findSellerFollow(
  container: MedusaContainer,
  customerId: string,
  sellerId: string
): Promise<SellerFollowRecord | null> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: customerSellerFollow.entryPoint,
    fields: ["seller_follower.id", "seller_follower.seller.id"],
    filters: { customer_id: customerId },
  })

  const match = data.find(
    (row) => row.seller_follower?.seller?.id === sellerId
  )

  if (!match?.seller_follower) {
    return null
  }

  return { id: match.seller_follower.id }
}

export async function countSellerFollowers(
  container: MedusaContainer,
  sellerId: string
): Promise<number> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { metadata } = await query.graph({
    entity: sellerFollowLink.entryPoint,
    fields: ["seller_follower.id"],
    filters: { seller_id: sellerId },
    pagination: { skip: 0, take: 1 },
  })

  return metadata?.count ?? 0
}
