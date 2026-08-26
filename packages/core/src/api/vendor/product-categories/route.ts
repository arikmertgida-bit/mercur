import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorProductCategoryListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const filters = req.filterableFields
  const q = filters.q

  // Medusa's default `q` free-text search also matches the long marketing
  // `description` field (searchable() on the ProductCategory model), so a
  // generic word appearing anywhere in another category's description (e.g.
  // "saat" meaning "hour") surfaces unrelated categories. Category search is
  // a name lookup, so match on `name` only.
  if (typeof q === "string" && q.length > 0) {
    delete filters.q
    filters.name = { $ilike: `%${q}%` }
  }

  const { data: product_categories, metadata } = await query.graph({
    entity: "product_category",
    fields: req.queryConfig.fields,
    filters,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    product_categories,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
