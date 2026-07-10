import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  isPresent,
  QueryContext,
} from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import type { ProductDTO } from "@mercurjs/types"

import customerWishlist from "../../../links/customer-wishlist"
import { createWishlistEntryWorkflow } from "../../../workflows/wishlist/workflows/create-wishlist"
import { StoreCreateWishlistType } from "./validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateWishlistType>,
  res: MedusaResponse
) => {
  const { result } = await createWishlistEntryWorkflow.run({
    container: req.scope,
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
    },
  })

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const {
    data: [wishlist],
  } = await query.graph({
    entity: "wishlist",
    fields: req.queryConfig.fields,
    filters: {
      id: result.id,
    },
  })

  res.status(201).json({ wishlist })
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const customerId = req.auth_context.actor_id

  const {
    data: [wishlist],
  } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: ["wishlist.products.id"],
    filters: {
      customer_id: customerId,
    },
  })

  const productIds: string[] =
    wishlist?.wishlist?.products?.map((product: ProductDTO) => product.id) ?? []

  const pricingContext = isPresent(req.pricingContext)
    ? { ...req.pricingContext, customer_id: customerId }
    : null

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: {
      id: productIds,
    },
    pagination: req.queryConfig.pagination,
    context: pricingContext
      ? { variants: { calculated_price: QueryContext(pricingContext) } }
      : undefined,
  })

  res.json({
    products,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
