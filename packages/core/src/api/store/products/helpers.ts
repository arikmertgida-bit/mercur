/**
 * Splits the virtual `variants.calculated_price[.*]` fields out of a
 * store-product field set. They are computed post-query from the variant's
 * own price set, not graph columns, so passing them to `query.graph` raises
 * `Trying to query by not existing property`.
 */
export const splitComputedVariantFields = (fields: string[]) => {
  const withCalculatedPrice = fields.some(
    (f) =>
      f === "variants.calculated_price" ||
      f.startsWith("variants.calculated_price.")
  )

  const filteredFields = fields.filter(
    (f) =>
      f !== "variants.calculated_price" &&
      !f.startsWith("variants.calculated_price.")
  )

  return { fields: filteredFields, withCalculatedPrice }
}
