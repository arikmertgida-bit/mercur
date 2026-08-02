export const vendorPriceListPriceFields = [
  "id",
  "currency_code",
  "amount",
  "min_quantity",
  "max_quantity",
  "created_at",
  "deleted_at",
  "updated_at",
  "price_set.variant.id",
  "price_rules.value",
  "price_rules.attribute",
]

export const vendorPriceListFields = [
  "id",
  "type",
  "description",
  "title",
  "status",
  "starts_at",
  "ends_at",
  "created_at",
  "updated_at",
  "deleted_at",
  "price_list_rules.value",
  "price_list_rules.attribute",
  ...vendorPriceListPriceFields.map((field) => `prices.${field}`),
]

export const listPriceListPriceQueryConfig = {
  defaults: vendorPriceListPriceFields,
  isList: true,
}

export const retrievePriceListQueryConfig = {
  defaults: vendorPriceListFields,
  isList: false,
}

export const listPriceListQueryConfig = {
  ...retrievePriceListQueryConfig,
  isList: true,
}

// The products listing is a JS-side aggregation (see fetchPriceListProductGroups)
// rather than a direct query.graph projection, so it has no field-selection
// defaults of its own — this queryConfig exists only to satisfy
// validateAndTransformQuery's offset/limit/order parsing.
export const listPriceListProductsQueryConfig = {
  defaults: [],
  isList: true,
}
