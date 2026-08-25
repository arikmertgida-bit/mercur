export const PRODUCT_VARIANT_IDS_KEY = "product_variant_ids"

export const PRODUCT_DETAIL_FIELDS = [
  "-variants",
  "+images.id",
  "+images.url",
  "+images.rank",
  "*categories",
  "*tags",
  "*type",
  "+additional_data",
  "*scoped_attributes",
  "+scoped_attributes.values.*",
  "+product_attribute_values.*",
  "+product_attribute_values.attribute.*",
  "+product_attribute_values.attribute.values.*",
].join(",")

export const PRODUCT_DETAIL_QUERY = { fields: PRODUCT_DETAIL_FIELDS } as const

// Fields needed to compute a product's aggregate live stock total from its
// variants' inventory items, without pulling in the rest of the (heavier)
// variant payload the detail table already fetches separately.
export const PRODUCT_STOCK_VARIANT_FIELDS =
  "id,inventory_items.inventory_item_id"

export const PRODUCT_STOCK_VARIANT_LIMIT = 999

export const LOW_STOCK_THRESHOLD = 20

