const defaultAdminReservationInventoryItemFields = [
  "id",
  "sku",
  "title",
  "description",
  "thumbnail",
  "requires_shipping",
  "origin_country",
  "hs_code",
  "mid_code",
  "material",
  "weight",
  "length",
  "height",
  "width",
  "metadata",
]

export const defaultAdminReservationFields = [
  "id",
  "location_id",
  "inventory_item_id",
  "quantity",
  "line_item_id",
  "description",
  "metadata",
  "created_at",
  "updated_at",
  ...defaultAdminReservationInventoryItemFields.map(
    (f) => `inventory_item.${f}`
  ),
  "inventory_item.seller.id",
  "inventory_item.seller.name",
  "inventory_item.variants.id",
  "inventory_item.variants.title",
  "inventory_item.variants.product.id",
  "inventory_item.variants.product.title",
]

export const retrieveTransformQueryConfig = {
  defaults: defaultAdminReservationFields,
  isList: false,
}

export const listTransformQueryConfig = {
  ...retrieveTransformQueryConfig,
  isList: true,
}
