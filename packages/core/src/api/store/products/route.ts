import {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  enrichProductAttributes,
  wrapProductVariantsWithCalculatedPrice,
  wrapProductVariantsWithInventoryQuantity,
} from "../../utils"
import { splitComputedVariantFields } from "./helpers"

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // `variants.calculated_price` and `variants.inventory_quantity` are both
  // computed post-query (price set / sales-channel-scoped stock), not graph
  // columns — strip them before the read.
  const { fields, withCalculatedPrice, withInventoryQuantity } =
    splitComputedVariantFields(req.queryConfig.fields)
  req.queryConfig.fields = fields

  // region_id / currency_code are consumed by setPricingContext only.
  // The Product entity has neither column, so passing them through to
  // query.graph raises `Trying to query by not existing property
  // Product.region_id`.
  const {
    region_id: _r,
    currency_code: _c,
    ...productFilters
  } = (req.filterableFields ?? {}) as Record<string, unknown>

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: productFilters,
    pagination: req.queryConfig.pagination,
  })

  await enrichProductAttributes(req.scope, products)

  if (withCalculatedPrice) {
    await wrapProductVariantsWithCalculatedPrice(req, products)
  }

  if (withInventoryQuantity) {
    await wrapProductVariantsWithInventoryQuantity(req, products)
  }

  res.json({
    products,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
