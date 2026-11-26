/**
 * MedusaError codes the app's admin error layer (apps/api admin-error-i18n)
 * translates. Kept free of imports so the error layer can read them without
 * loading routes or workflows.
 */
export const PRODUCT_SELLER_REQUIRED_CODE = "product_seller_required"
export const PRODUCT_SELLER_UNCHANGED_CODE = "product_seller_unchanged"
export const PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE =
  "product_shipping_profile_not_seller"
export const PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE =
  "product_stock_location_not_seller"
export const PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE =
  "product_inventory_item_not_seller"
export const ORDER_VARIANT_NOT_SELLER_CODE = "order_variant_not_seller"
export const PRODUCT_MOVE_RESERVED_STOCK_CODE = "product_move_reserved_stock"
export const PRODUCT_MOVE_SELLER_PROMOTIONS_CODE =
  "product_move_seller_promotions"
export const PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE =
  "product_move_seller_price_lists"

/**
 * The two "still used by the old seller" errors end with the blocking
 * promotion codes / price list titles after this separator, so the admin error
 * layer can keep the names when it translates the sentence.
 */
export const PRODUCT_MOVE_NAMES_SEPARATOR = ": "
