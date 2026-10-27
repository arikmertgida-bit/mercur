/**
 * Permission strings follow `{key}:{right}`, e.g. `orders:view`,
 * `products:edit`, `sellers.approval:edit`.
 *
 * Keys mirror the catalog declared server-side with `defineMercurPermissions`
 * (`packages/core/src/permissions/definitions`). Rights nest:
 * `manage` implies `edit`, `edit` implies `view`.
 */

/**
 * Registry of permission keys. Plugins add their own keys through declaration
 * merging:
 *
 * @example
 * declare module "@mercurjs/dashboard-sdk" {
 *   interface PermissionKeys {
 *     messaging: true
 *   }
 * }
 */
export interface PermissionKeys {
    "sellers": true
    "sellers.approval": true
    "sellers.premium": true
    "members": true
    "members.invites": true
    "roles": true
    "roles.owner": true
    "orders": true
    "orders.refunds": true
    "orders.returns": true
    "orders.edits": true
    "order_groups": true
    "payments": true
    "customers": true
    "customer_groups": true
    "products": true
    "products.review": true
    "product_changes": true
    "product_categories": true
    "product_collections": true
    "product_types": true
    "product_tags": true
    "product_attributes": true
    "inventory_items": true
    "reservations": true
    "stock_locations": true
    "price_lists": true
    "price_preferences": true
    "promotions": true
    "campaigns": true
    "commission_rates": true
    "commission_lines": true
    "payouts": true
    "payout_accounts": true
    "shipping_profiles": true
    "shipping_options": true
    "fulfillment_sets": true
    "regions": true
    "tax_regions": true
    "store": true
    "sales_channels": true
    "return_reasons": true
    "refund_reasons": true
    "users": true
    "api_keys": true
    "translations": true
    "notifications": true
    "workflow_executions": true
    "reviews": true
}

export type PermissionKey = Extract<keyof PermissionKeys, string>

export type PermissionRight = "view" | "edit" | "manage"

export type Permission = `${PermissionKey}:${PermissionRight}`

/** Effective rights of the acting user, as returned by `fields=+permissions`. */
export type PermissionMap = Partial<Record<string, PermissionRight>>

export const PERMISSION_RIGHT_RANK: Record<PermissionRight, number> = {
    view: 1,
    edit: 2,
    manage: 3,
}

export interface PermissionsContextValue {
    /** `null` while no access-control module is enforcing permissions. */
    permissions: PermissionMap | null
    isLoading: boolean
    /** When `false`, every check resolves to `true`. */
    isEnforced: boolean
    hasPermission: (permission: Permission) => boolean
    hasAnyPermission: (permissions: Permission[]) => boolean
    hasAllPermissions: (permissions: Permission[]) => boolean
    can: (key: PermissionKey, right?: PermissionRight) => boolean
}

const PERMISSION_RIGHTS: readonly string[] = Object.keys(PERMISSION_RIGHT_RANK)

export function isPermissionRight(value: string): value is PermissionRight {
    return PERMISSION_RIGHTS.includes(value)
}

/**
 * Splits `key:right`. The key stays a plain string: `PermissionKeys` is an
 * augmentable, type-only registry, so no runtime check can prove a key is in
 * it — and `satisfiesPermission` only looks keys up in the effective map.
 */
export function parsePermission(
    permission: string
): { key: string; right: PermissionRight } | null {
    const index = permission.lastIndexOf(":")
    if (index <= 0) {
        return null
    }

    const right = permission.slice(index + 1)
    if (!isPermissionRight(right)) {
        return null
    }

    return {
        key: permission.slice(0, index),
        right,
    }
}

export function buildPermission(
    key: PermissionKey,
    right: PermissionRight
): Permission {
    return `${key}:${right}`
}

export function satisfiesPermission(
    permissions: PermissionMap,
    key: string,
    right: PermissionRight
): boolean {
    const granted = permissions[key]
    return (
        !!granted &&
        PERMISSION_RIGHT_RANK[granted] >= PERMISSION_RIGHT_RANK[right]
    )
}
