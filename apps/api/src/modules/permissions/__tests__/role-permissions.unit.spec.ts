import "@mercurjs/core/permissions/index"
import {
  getPermission,
  getPermissionCatalog,
  satisfiesRight,
} from "@mercurjs/core/permissions/registry"
import {
  MemberAreaPermissions,
  PermissionActor,
  PermissionMap,
  SellerRole,
} from "@mercurjs/types"
import { MedusaError } from "@medusajs/framework/utils"

import "../../../permissions"
import {
  MEMBER_PERMISSION_AREAS,
  ROLE_AREA_TEMPLATES,
  validateMemberAreaPermissions,
} from "../member-areas"
import { SELLER_ROLE_PERMISSIONS } from "../role-permissions"
import { resolveActorPermissions } from "../service"

// The role table as hand-written in 9e-3b-3a (approved 2026-11-18); the area
// templates must keep producing exactly this.
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

const LEGACY_SELLER_ROLE_PERMISSIONS: Record<LimitedSellerRole, PermissionMap> = {
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


const member = (
  role: string | null,
  is_owner = false,
  permissions: MemberAreaPermissions | null = null
): PermissionActor => ({
  actor_type: "member",
  actor_id: "mem_1",
  surface: "vendor",
  seller_id: "sel_1",
  seller_member_id: "selmem_1",
  seller_member_role_id: role,
  seller_member_is_owner: is_owner,
  seller_member_permissions: permissions,
})

const resolve = (actor: PermissionActor): PermissionMap =>
  resolveActorPermissions(actor, getPermissionCatalog())

const vendorKeys = (): string[] =>
  getPermissionCatalog()
    .filter((definition) => definition.surface.includes("vendor"))
    .map((definition) => definition.key)

describe("seller role permissions", () => {
  it("every role grant is a real vendor right and satisfies its dependencies", () => {
    const problems: string[] = []
    for (const [role, map] of Object.entries(SELLER_ROLE_PERMISSIONS)) {
      for (const [key, right] of Object.entries(map)) {
        const definition = getPermission(key)
        if (!definition || !definition.surface.includes("vendor")) {
          problems.push(`${role}: unknown vendor key ${key}`)
          continue
        }
        if (!definition.rights.includes(right)) {
          problems.push(`${role}: ${key} has no right ${right}`)
        }
        for (const requirement of definition.requires ?? []) {
          if (!satisfiesRight(map[requirement.key], requirement.right)) {
            problems.push(`${role}: ${key} needs ${requirement.key}:${requirement.right}`)
          }
        }
      }
    }
    expect(problems).toEqual([])
  })

  it("gives the owner and administration every vendor right", () => {
    for (const actor of [
      member(SellerRole.SUPPORT, true),
      member(SellerRole.SELLER_ADMINISTRATION),
    ]) {
      const granted = resolve(actor)
      expect(Object.keys(granted).sort()).toEqual(vendorKeys().sort())
      expect(granted.members).toEqual("manage")
      expect(granted.payout_accounts).toEqual("edit")
    }
  })

  it("keeps admins (users and secret keys) fully privileged", () => {
    for (const actor_type of ["user", "api-key"]) {
      const granted = resolve({ actor_type, actor_id: "x", surface: "admin" })
      expect(granted.sellers).toEqual("manage")
      expect(granted.users).toEqual("manage")
    }
    expect(resolve({ actor_type: "member", actor_id: "x", surface: "admin" })).toEqual({})
  })

  it("denies everything to unknown or missing roles and non-members", () => {
    expect(resolve(member(null))).toEqual({})
    expect(resolve(member("role_made_up"))).toEqual({})
    expect(
      resolve({ actor_type: "customer", actor_id: "c", surface: "vendor", seller_member_id: "s" })
    ).toEqual({})
  })

  it("applies the approved table", () => {
    const order = resolve(member(SellerRole.ORDER_MANAGEMENT))
    expect(order.orders).toEqual("manage")
    expect(order.messages).toEqual("edit")
    expect(order.products).toEqual("view")
    expect(order.members).toBeUndefined()
    expect(order.payouts).toBeUndefined()

    const inventory = resolve(member(SellerRole.INVENTORY_MANAGEMENT))
    expect(inventory.products).toEqual("manage")
    expect(inventory.inventory_items).toEqual("manage")
    expect(inventory.orders).toEqual("view")
    expect(inventory.customers).toBeUndefined()
    expect(inventory.messages).toBeUndefined()
    expect(inventory.dashboard).toBeUndefined()

    const accounting = resolve(member(SellerRole.ACCOUNTING))
    expect(accounting.payouts).toEqual("view")
    expect(accounting.payout_accounts).toEqual("view")
    expect(accounting.commission_lines).toEqual("view")
    expect(accounting.products).toEqual("view")
    expect(accounting.messages).toBeUndefined()

    const support = resolve(member(SellerRole.SUPPORT))
    expect(support.reviews).toEqual("edit")
    expect(support.messages).toEqual("edit")
    expect(support.followers).toEqual("view")
    expect(support.products).toEqual("view")
    expect(support.store).toEqual("view")
    expect(support.payouts).toBeUndefined()
    expect(support.dashboard).toBeUndefined()

    for (const granted of [order, inventory, accounting, support]) {
      expect(granted.store).toEqual("view")
      expect(granted.members).toBeUndefined()
      expect(granted["members.invites"]).toBeUndefined()
      expect(granted.roles).toBeUndefined()
    }
  })

  it("derives every role from its area template without changing the approved table", () => {
    expect(SELLER_ROLE_PERMISSIONS).toEqual(LEGACY_SELLER_ROLE_PERMISSIONS)
  })
})

describe("custom member permissions (checkbox grant)", () => {
  const full = (): PermissionMap => resolve(member(null, true))
  const validate = (areas: MemberAreaPermissions, granted: PermissionMap = full()) =>
    validateMemberAreaPermissions(areas, granted, getPermissionCatalog())

  const codeOf = (fn: () => void): string | undefined => {
    try {
      fn()
    } catch (error) {
      return error instanceof MedusaError ? error.code : "not-medusa-error"
    }
    return undefined
  }

  it("lets a custom grant replace the role template", () => {
    const granted = resolve(
      member(SellerRole.SUPPORT, false, { orders: "view", products: "manage" })
    )
    expect(granted.products).toEqual("manage")
    expect(granted.product_changes).toEqual("edit")
    expect(granted.product_attributes).toEqual("manage")
    expect(granted.orders).toEqual("view")
    expect(granted.store).toEqual("view")
    expect(granted.reviews).toBeUndefined()
    expect(granted.messages).toBeUndefined()
    expect(granted.members).toBeUndefined()
  })

  it("keeps the owner and administration full whatever is stored", () => {
    for (const actor of [
      member(SellerRole.SUPPORT, true, { orders: "view" }),
      member(SellerRole.SELLER_ADMINISTRATION, false, { orders: "view" }),
    ]) {
      expect(resolve(actor).members).toEqual("manage")
    }
  })

  it("accepts every template and the full table", () => {
    for (const template of Object.values(ROLE_AREA_TEMPLATES)) {
      expect(validate(template)).toEqual(template)
    }
    const everything = Object.fromEntries(
      MEMBER_PERMISSION_AREAS.map((area) => [area.id, area.max_right])
    )
    expect(validate(everything)).toEqual(everything)
    const granted = resolve(member(SellerRole.SUPPORT, false, everything))
    expect(granted.members).toBeUndefined()
    expect(granted["members.invites"]).toBeUndefined()
    expect(granted.roles).toBeUndefined()
    expect(granted.store).toEqual("view")
    expect(granted.payout_accounts).toEqual("view")
    expect(granted.sales_channels).toEqual("view")
  })

  it("rejects unknown areas, rights above the area maximum and team keys", () => {
    expect(codeOf(() => validate({ members: "view" }))).toEqual("member_permissions_invalid")
    expect(codeOf(() => validate({ payouts: "edit" }))).toEqual("member_permissions_invalid")
    expect(codeOf(() => validate({ reviews: "manage" }))).toEqual("member_permissions_invalid")
  })

  it("rejects a grant whose dependency is left unchecked", () => {
    expect(codeOf(() => validate({ returns: "view" }))).toEqual("member_permissions_invalid")
    expect(codeOf(() => validate({ refunds: "edit" }))).toEqual("member_permissions_invalid")
    expect(codeOf(() => validate({ returns: "view", orders: "view" }))).toBeUndefined()
  })

  it("never grants beyond the granter", () => {
    const support = resolve(member(SellerRole.SUPPORT))
    expect(codeOf(() => validate({ orders: "manage" }, support))).toEqual(
      "member_permissions_escalation"
    )
    expect(codeOf(() => validate({ orders: "view", reviews: "edit" }, support))).toBeUndefined()
  })
})
