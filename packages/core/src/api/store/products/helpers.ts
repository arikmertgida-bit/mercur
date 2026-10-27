import { QueryFilter } from "../../../utils/query-filter"

/**
 * `filterableFields` of the store product routes. `region_id` and
 * `currency_code` only feed the pricing context; `attributes` is rewritten
 * into variant-option clauses by the products middleware.
 */
export type StoreProductFilterFields = QueryFilter & {
  region_id?: string
  currency_code?: string
  attributes?: Record<string, string | string[]>
  $and?: QueryFilter[]
}

/**
 * Splits the virtual `variants.calculated_price[.*]` and
 * `variants.inventory_quantity` fields out of a store-product field set.
 * Both are computed post-query — the former from the variant's own price
 * set, the latter by summing inventory levels across the stock locations
 * tied to the request's sales channel — not graph columns, so passing them
 * to `query.graph` raises `Trying to query by not existing property`.
 */
export const splitComputedVariantFields = (fields: string[]) => {
  const withCalculatedPrice = fields.some(
    (f) =>
      f === "variants.calculated_price" ||
      f.startsWith("variants.calculated_price.")
  )
  const withInventoryQuantity = fields.includes("variants.inventory_quantity")

  const filteredFields = fields.filter(
    (f) =>
      f !== "variants.calculated_price" &&
      !f.startsWith("variants.calculated_price.") &&
      f !== "variants.inventory_quantity"
  )

  return { fields: filteredFields, withCalculatedPrice, withInventoryQuantity }
}
