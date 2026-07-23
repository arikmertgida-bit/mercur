import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import type {} from "@mercurjs/core/types/seller-context"

import sellerFollowLink from "../../../links/seller-follow-link"
import { SellerFollowerLinkRowSchema, extractAvatarUrl, parseRows } from "../../../lib/graph-schemas"
import { resolveOrderCountsByCustomer, resolveReviewStatsByCustomer } from "./helpers"

export type VendorFollowerListItem = {
  customer_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  followed_at: string | Date
  orders_count: number
  reviews_count: number
  reviews_average_rating: number | null
}

export type VendorFollowersListResponse = {
  followers: VendorFollowerListItem[]
  count: number
  offset: number
  limit: number
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorFollowersListResponse>
) => {
  if (!req.seller_context?.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    )
  }
  const sellerId = req.seller_context.seller_id

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: linkRows, metadata } = await query.graph({
    entity: sellerFollowLink.entryPoint,
    fields: req.queryConfig.fields,
    filters: { seller_id: sellerId },
    pagination: req.queryConfig.pagination,
  })

  const followerRows = parseRows(SellerFollowerLinkRowSchema, linkRows).filter(
    (row) => row.seller_follower?.customer
  )

  const customerIds = followerRows.map((row) => row.seller_follower!.customer!.id)

  const [ordersCountByCustomer, reviewStatsByCustomer] = await Promise.all([
    resolveOrderCountsByCustomer(query, sellerId, customerIds),
    resolveReviewStatsByCustomer(query, sellerId, customerIds),
  ])

  const followers: VendorFollowerListItem[] = followerRows.map((row) => {
    const follow = row.seller_follower!
    const customer = follow.customer!
    const stats = reviewStatsByCustomer[customer.id]

    return {
      customer_id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      avatar_url: extractAvatarUrl(customer.metadata) ?? null,
      followed_at: follow.created_at,
      orders_count: ordersCountByCustomer[customer.id] ?? 0,
      reviews_count: stats?.count ?? 0,
      reviews_average_rating: stats?.average ?? null,
    }
  })

  res.json({
    followers,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
