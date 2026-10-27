const defaultVendorInventoryItemFields = [
  "id",
  "sku",
  "origin_country",
  "hs_code",
  "requires_shipping",
  "mid_code",
  "material",
  "weight",
  "length",
  "height",
  "width",
  "title",
  "description",
  "thumbnail",
  "metadata",
]

export const defaultVendorReservationFields = [
  "id",
  "location_id",
  "inventory_item_id",
  "quantity",
  "line_item_id",
  "description",
  "metadata",
  "created_at",
  "updated_at",
  ...defaultVendorInventoryItemFields.map((f) => `inventory_item.${f}`),
  // Product column: reached through Medusa's own inventory_item -> variants
  // -> product relation.
  "inventory_item.variants.id",
  "inventory_item.variants.product.id",
  "inventory_item.variants.product.title",
]

export const retrieveTransformQueryConfig = {
  defaults: defaultVendorReservationFields,
  isList: false,
}

export const listTransformQueryConfig = {
  ...retrieveTransformQueryConfig,
  isList: true,
}

export const vendorReservationQueryConfig = {
  list: listTransformQueryConfig,
  retrieve: retrieveTransformQueryConfig,
}
