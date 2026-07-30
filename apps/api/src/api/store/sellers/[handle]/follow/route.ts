import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import {
  CustomerSummarySchema,
  buildCustomerDisplayName,
  parseFirstRow,
} from "../../../../../lib/graph-schemas"
import { emitFollowerNewFollowerEvent } from "../../../../../lib/follower-events"
import {
  countSellerFollowers,
  findSellerFollow,
} from "../../../../../modules/seller-follow/utils"
import { followSellerWorkflow } from "../../../../../workflows/seller-follow/workflows/follow-seller"
import { unfollowSellerWorkflow } from "../../../../../workflows/seller-follow/workflows/unfollow-seller"

async function resolveSellerIdByHandle(
  query: Query,
  handle: string
): Promise<string> {
  const { data: sellers } = await query.graph({
    entity: "seller",
    filters: { handle },
    fields: ["id"],
  })

  const seller = sellers[0]

  if (!seller) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Seller with handle: ${handle} was not found`
    )
  }

  return seller.id
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const sellerId = await resolveSellerIdByHandle(query, req.params.handle)
  const customerId = req.auth_context.actor_id

  const follow = await findSellerFollow(req.scope, customerId, sellerId)
  const followersCount = await countSellerFollowers(req.scope, sellerId)

  res.json({
    following: Boolean(follow),
    followers_count: followersCount,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const sellerId = await resolveSellerIdByHandle(query, req.params.handle)
  const customerId = req.auth_context.actor_id

  const { result } = await followSellerWorkflow.run({
    container: req.scope,
    input: { customer_id: customerId, seller_id: sellerId },
  })

  if (result.created) {
    const { data: customers } = await query.graph({
      entity: "customer",
      filters: { id: customerId },
      fields: ["id", "first_name", "last_name", "email"],
    })
    const customer = parseFirstRow(CustomerSummarySchema, customers)
    const customerName = customer ? buildCustomerDisplayName(customer) : null

    await emitFollowerNewFollowerEvent(req.scope, {
      sellerToNotify: sellerId,
      customerId,
      customerName,
    })
  }

  const followersCount = await countSellerFollowers(req.scope, sellerId)

  res.json({
    following: true,
    followers_count: followersCount,
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const sellerId = await resolveSellerIdByHandle(query, req.params.handle)
  const customerId = req.auth_context.actor_id

  const follow = await findSellerFollow(req.scope, customerId, sellerId)

  if (follow) {
    await unfollowSellerWorkflow.run({
      container: req.scope,
      input: { id: follow.id, customer_id: customerId, seller_id: sellerId },
    })
  }

  const followersCount = await countSellerFollowers(req.scope, sellerId)

  res.json({
    following: false,
    followers_count: followersCount,
  })
}
