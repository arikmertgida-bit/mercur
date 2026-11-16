/**
 * `MedusaError.code` of a cart completion stopped because the cart's stored
 * prices or discounts no longer match what the catalog and the promotion
 * module give at completion time. The store route refreshes the cart on it,
 * so the shopper sees the current prices before paying.
 */
export const CART_PRICES_CHANGED_ERROR_CODE = "cart_prices_changed"
