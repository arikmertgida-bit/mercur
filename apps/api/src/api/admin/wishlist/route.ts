import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  WishlistRowSchema,
  buildCustomerDisplayName,
  parseRows,
} from "../../../lib/graph-schemas"
import { adminWishlistFields } from "./query-config"
import { AdminGetWishlistsParamsType } from "./validators"

export type AdminWishlistRow = {
  id: string
  reference: string
  created_at: string | Date
  updated_at: string | Date
  customer_id: string | null
  customer_name: string
  products: { id: string; title: string }[]
}

export type AdminWishlistsListResponse = {
  wishlists: AdminWishlistRow[]
  count: number
  offset: number
  limit: number
}

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetWishlistsParamsType>,
  res: MedusaResponse<AdminWishlistsListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: rawWishlists, metadata } = await query.graph({
    entity: "wishlist",
    fields: req.queryConfig.fields ?? adminWishlistFields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  const wishlists = parseRows(WishlistRowSchema, rawWishlists)

  const result: AdminWishlistRow[] = wishlists.map((wishlist) => ({
    id: wishlist.id,
    reference: wishlist.reference,
    created_at: wishlist.created_at,
    updated_at: wishlist.updated_at,
    customer_id: wishlist.customer?.id ?? null,
    customer_name: wishlist.customer
      ? buildCustomerDisplayName(wishlist.customer)
      : "-",
    products: wishlist.products ?? [],
  }))

  res.json({
    wishlists: result,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
