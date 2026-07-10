import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import { SellerStatus } from "@mercurjs/types"

import customerSellerFollow from "../../../links/customer-seller-follow"
import { StoreGetFollowedSellersParamsType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetFollowedSellersParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const customerId = req.auth_context.actor_id

  const { data, metadata } = await query.graph({
    entity: customerSellerFollow.entryPoint,
    fields: req.queryConfig.fields,
    filters: { customer_id: customerId },
    pagination: req.queryConfig.pagination,
  })

  const sellers = data
    .filter((row) => row.seller_follower?.seller)
    .map((row) => {
      const followRow = row.seller_follower
      const seller = followRow?.seller

      if (!followRow || !seller) {
        return null
      }

      return {
        id: seller.id,
        name: seller.name,
        handle: seller.handle,
        photo: seller.logo ?? "",
        followed_at: followRow.created_at,
        status: seller.status,
        is_active: seller.status === SellerStatus.OPEN,
      }
    })
    .filter((seller): seller is NonNullable<typeof seller> => seller !== null)

  res.json({
    sellers,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
