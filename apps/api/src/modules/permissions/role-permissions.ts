import { PermissionMap, SellerRole } from "@mercurjs/types"

/**
 * What each non-administration seller role may do (table approved by the
 * owner on 2026-11-18). The owner member and role_seller_administration hold
 * every vendor right and are not listed here. A key missing from a map means
 * no access.
 */
type LimitedSellerRole = Exclude<SellerRole, SellerRole.SELLER_ADMINISTRATION>

const REFERENCE_DATA: PermissionMap = {
  store: "view",
  regions: "view",
  tax_regions: "view",
  return_reasons: "view",
  refund_reasons: "view",
  sales_channels: "view",
  price_preferences: "view",
}

const CATALOG_VIEW: PermissionMap = {
  products: "view",
  product_changes: "view",
  product_attributes: "view",
  product_categories: "view",
  product_collections: "view",
  product_types: "view",
  product_tags: "view",
}

export const SELLER_ROLE_PERMISSIONS: Record<LimitedSellerRole, PermissionMap> = {
  [SellerRole.ORDER_MANAGEMENT]: {
    ...REFERENCE_DATA,
    ...CATALOG_VIEW,
    orders: "manage",
    "orders.edits": "manage",
    "orders.returns": "manage",
    "orders.refunds": "edit",
    payments: "edit",
    customers: "view",
    customer_groups: "view",
    inventory_items: "view",
    reservations: "view",
    stock_locations: "view",
    shipping_profiles: "view",
    shipping_options: "view",
    fulfillment_sets: "view",
    promotions: "view",
    campaigns: "view",
    return_reasons: "edit",
    reviews: "view",
    messages: "edit",
    dashboard: "view",
  },
  [SellerRole.INVENTORY_MANAGEMENT]: {
    ...REFERENCE_DATA,
    orders: "view",
    "orders.edits": "view",
    "orders.returns": "edit",
    products: "manage",
    product_changes: "edit",
    product_attributes: "manage",
    product_categories: "edit",
    product_collections: "edit",
    product_types: "edit",
    product_tags: "edit",
    inventory_items: "manage",
    reservations: "manage",
    stock_locations: "manage",
    shipping_profiles: "manage",
    shipping_options: "manage",
    fulfillment_sets: "manage",
    price_lists: "manage",
    price_preferences: "edit",
    reviews: "view",
  },
  [SellerRole.ACCOUNTING]: {
    ...REFERENCE_DATA,
    ...CATALOG_VIEW,
    orders: "view",
    "orders.edits": "view",
    "orders.returns": "view",
    "orders.refunds": "edit",
    payments: "edit",
    customers: "view",
    customer_groups: "view",
    price_lists: "view",
    promotions: "view",
    campaigns: "view",
    commission_rates: "view",
    commission_lines: "view",
    payouts: "view",
    payout_accounts: "view",
    dashboard: "view",
  },
  [SellerRole.SUPPORT]: {
    ...REFERENCE_DATA,
    ...CATALOG_VIEW,
    orders: "view",
    "orders.edits": "view",
    "orders.returns": "view",
    customers: "view",
    customer_groups: "view",
    promotions: "view",
    campaigns: "view",
    reviews: "edit",
    messages: "edit",
    followers: "view",
  },
}

export function isLimitedSellerRole(role: string): role is LimitedSellerRole {
  return Object.prototype.hasOwnProperty.call(SELLER_ROLE_PERMISSIONS, role)
}
