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
