import {
  PERMISSION_RIGHT_RANK,
  type PermissionRight,
} from "@mercurjs/types/permissions"

/**
 * Which row of the member invite table a permission key belongs to, and the
 * highest right that row can grant for it. Mirrors `MEMBER_PERMISSION_AREAS`
 * in apps/api (member-areas.ts); its unit test fails when the two drift.
 */
export const PERMISSION_KEY_AREAS: Record<string, { area: string; max: PermissionRight }> = {
  orders: { area: "orders", max: "manage" },
  "orders.edits": { area: "orders", max: "manage" },
  "orders.returns": { area: "returns", max: "manage" },
  return_reasons: { area: "return_reason_requests", max: "edit" },
  "orders.refunds": { area: "refunds", max: "edit" },
  payments: { area: "refunds", max: "edit" },
  customers: { area: "customers", max: "manage" },
  customer_groups: { area: "customers", max: "manage" },
  products: { area: "products", max: "manage" },
  product_changes: { area: "products", max: "edit" },
  product_attributes: { area: "products", max: "manage" },
  product_categories: { area: "catalog", max: "manage" },
  product_collections: { area: "catalog", max: "manage" },
  product_types: { area: "catalog", max: "manage" },
  product_tags: { area: "catalog", max: "manage" },
  inventory_items: { area: "inventory", max: "manage" },
  reservations: { area: "inventory", max: "manage" },
  stock_locations: { area: "inventory", max: "manage" },
  shipping_profiles: { area: "shipping", max: "manage" },
  shipping_options: { area: "shipping", max: "manage" },
  fulfillment_sets: { area: "shipping", max: "manage" },
  price_lists: { area: "price_lists", max: "manage" },
  price_preferences: { area: "price_lists", max: "edit" },
  promotions: { area: "promotions", max: "manage" },
  campaigns: { area: "promotions", max: "manage" },
  commission_rates: { area: "commissions", max: "view" },
  commission_lines: { area: "commissions", max: "view" },
  payouts: { area: "payouts", max: "view" },
  payout_accounts: { area: "payouts", max: "view" },
  reviews: { area: "reviews", max: "edit" },
  messages: { area: "messages", max: "edit" },
  followers: { area: "followers", max: "view" },
  dashboard: { area: "dashboard", max: "view" },
}

/**
 * Keys outside the table. Their view right is held by every member; anything
 * more comes only with the administration role.
 */
export const PERMISSION_KEY_OTHER_LABELS: Record<string, string> = {
  members: "team",
  "members.invites": "team",
  roles: "team",
  store: "store",
  sales_channels: "salesChannels",
  regions: "regions",
  tax_regions: "taxRegions",
  refund_reasons: "refundReasons",
}

/**
 * `labelKey` names the area; `administrationOnly` means no checkbox grants the
 * right, only the administration role does.
 */
export type PermissionLabel = {
  labelKey: string
  right: PermissionRight
  administrationOnly: boolean
}

/** How the access-denied page names a required `key:right`, or `null` if unknown. */
export const describePermissionKey = (
  key: string,
  right: PermissionRight
): PermissionLabel | null => {
  const area = PERMISSION_KEY_AREAS[key]
  if (area) {
    return {
      labelKey: `users.permissions.areas.${area.area}`,
      right,
      administrationOnly: PERMISSION_RIGHT_RANK[right] > PERMISSION_RIGHT_RANK[area.max],
    }
  }

  const other = PERMISSION_KEY_OTHER_LABELS[key]
  if (other) {
    return {
      labelKey: `users.permissions.otherAreas.${other}`,
      right,
      administrationOnly: right !== "view" || other === "team",
    }
  }

  return null
}
