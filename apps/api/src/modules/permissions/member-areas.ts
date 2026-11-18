import {
  MemberAreaPermissions,
  PERMISSION_RIGHT_RANK,
  PermissionDefinition,
  PermissionMap,
  PermissionRight,
  SellerRole,
} from "@mercurjs/types"
import { MedusaError } from "@medusajs/framework/utils"
import { satisfiesRight } from "@mercurjs/core/permissions/registry"
import {
  MEMBER_PERMISSIONS_ESCALATION_CODE,
  MEMBER_PERMISSIONS_INVALID_CODE,
} from "@mercurjs/core/api/utils/vendor-error-codes"

import { KAYI_VENDOR_PERMISSION } from "../../permissions"

/**
 * The rows of the member invite checkbox table (approved by the owner on
 * 2026-11-19). An area right is granted to each of its keys, capped by the
 * key's own `max`. Team management, store settings, payout account and sales
 * channel edits are not areas: only the administration template holds them.
 */
export const MEMBER_PERMISSION_AREA = {
  ORDERS: "orders",
  RETURNS: "returns",
  RETURN_REASON_REQUESTS: "return_reason_requests",
  REFUNDS: "refunds",
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  CATALOG: "catalog",
  INVENTORY: "inventory",
  SHIPPING: "shipping",
  PRICE_LISTS: "price_lists",
  PROMOTIONS: "promotions",
  COMMISSIONS: "commissions",
  PAYOUTS: "payouts",
  REVIEWS: "reviews",
  MESSAGES: "messages",
  FOLLOWERS: "followers",
  DASHBOARD: "dashboard",
} as const

export type MemberPermissionAreaId =
  (typeof MEMBER_PERMISSION_AREA)[keyof typeof MEMBER_PERMISSION_AREA]

type AreaKey = { key: string; max?: PermissionRight }

export interface MemberPermissionArea {
  id: MemberPermissionAreaId
  max_right: PermissionRight
  keys: AreaKey[]
}

const A = MEMBER_PERMISSION_AREA

export const MEMBER_PERMISSION_AREAS: MemberPermissionArea[] = [
  { id: A.ORDERS, max_right: "manage", keys: [{ key: "orders" }, { key: "orders.edits" }] },
  { id: A.RETURNS, max_right: "manage", keys: [{ key: "orders.returns" }] },
  { id: A.RETURN_REASON_REQUESTS, max_right: "edit", keys: [{ key: "return_reasons" }] },
  { id: A.REFUNDS, max_right: "edit", keys: [{ key: "orders.refunds" }, { key: "payments" }] },
  { id: A.CUSTOMERS, max_right: "manage", keys: [{ key: "customers" }, { key: "customer_groups" }] },
  {
    id: A.PRODUCTS,
    max_right: "manage",
    keys: [{ key: "products" }, { key: "product_changes", max: "edit" }, { key: "product_attributes" }],
  },
  {
    id: A.CATALOG,
    max_right: "manage",
    keys: [
      { key: "product_categories" },
      { key: "product_collections" },
      { key: "product_types" },
      { key: "product_tags" },
    ],
  },
  {
    id: A.INVENTORY,
    max_right: "manage",
    keys: [{ key: "inventory_items" }, { key: "reservations" }, { key: "stock_locations" }],
  },
  {
    id: A.SHIPPING,
    max_right: "manage",
    keys: [{ key: "shipping_profiles" }, { key: "shipping_options" }, { key: "fulfillment_sets" }],
  },
  {
    id: A.PRICE_LISTS,
    max_right: "manage",
    keys: [{ key: "price_lists" }, { key: "price_preferences", max: "edit" }],
  },
  { id: A.PROMOTIONS, max_right: "manage", keys: [{ key: "promotions" }, { key: "campaigns" }] },
  { id: A.COMMISSIONS, max_right: "view", keys: [{ key: "commission_rates" }, { key: "commission_lines" }] },
  { id: A.PAYOUTS, max_right: "view", keys: [{ key: "payouts" }, { key: "payout_accounts" }] },
  { id: A.REVIEWS, max_right: "edit", keys: [{ key: KAYI_VENDOR_PERMISSION.REVIEWS }] },
  { id: A.MESSAGES, max_right: "edit", keys: [{ key: KAYI_VENDOR_PERMISSION.MESSAGES }] },
  { id: A.FOLLOWERS, max_right: "view", keys: [{ key: KAYI_VENDOR_PERMISSION.FOLLOWERS }] },
  { id: A.DASHBOARD, max_right: "view", keys: [{ key: KAYI_VENDOR_PERMISSION.DASHBOARD }] },
]

/** Every member holds these; the panel pages need them to load. */
export const BASE_MEMBER_PERMISSIONS: PermissionMap = {
  store: "view",
  regions: "view",
  tax_regions: "view",
  return_reasons: "view",
  refund_reasons: "view",
  sales_channels: "view",
  price_preferences: "view",
}

type LimitedSellerRole = Exclude<SellerRole, SellerRole.SELLER_ADMINISTRATION>

export const ROLE_AREA_TEMPLATES: Record<LimitedSellerRole, MemberAreaPermissions> = {
  [SellerRole.ORDER_MANAGEMENT]: {
    [A.ORDERS]: "manage",
    [A.RETURNS]: "manage",
    [A.RETURN_REASON_REQUESTS]: "edit",
    [A.REFUNDS]: "edit",
    [A.CUSTOMERS]: "view",
    [A.PRODUCTS]: "view",
    [A.CATALOG]: "view",
    [A.INVENTORY]: "view",
    [A.SHIPPING]: "view",
    [A.PROMOTIONS]: "view",
    [A.REVIEWS]: "view",
    [A.MESSAGES]: "edit",
    [A.DASHBOARD]: "view",
  },
  [SellerRole.INVENTORY_MANAGEMENT]: {
    [A.ORDERS]: "view",
    [A.RETURNS]: "edit",
    [A.PRODUCTS]: "manage",
    [A.CATALOG]: "edit",
    [A.INVENTORY]: "manage",
    [A.SHIPPING]: "manage",
    [A.PRICE_LISTS]: "manage",
    [A.REVIEWS]: "view",
  },
  [SellerRole.ACCOUNTING]: {
    [A.ORDERS]: "view",
    [A.RETURNS]: "view",
    [A.REFUNDS]: "edit",
    [A.CUSTOMERS]: "view",
    [A.PRODUCTS]: "view",
    [A.CATALOG]: "view",
    [A.PRICE_LISTS]: "view",
    [A.PROMOTIONS]: "view",
    [A.COMMISSIONS]: "view",
    [A.PAYOUTS]: "view",
    [A.DASHBOARD]: "view",
  },
  [SellerRole.SUPPORT]: {
    [A.ORDERS]: "view",
    [A.RETURNS]: "view",
    [A.CUSTOMERS]: "view",
    [A.PRODUCTS]: "view",
    [A.CATALOG]: "view",
    [A.PROMOTIONS]: "view",
    [A.REVIEWS]: "edit",
    [A.MESSAGES]: "edit",
    [A.FOLLOWERS]: "view",
  },
}

const AREAS_BY_ID = new Map<string, MemberPermissionArea>(
  MEMBER_PERMISSION_AREAS.map((area) => [area.id, area])
)

function lowerRight(a: PermissionRight, b: PermissionRight): PermissionRight {
  return PERMISSION_RIGHT_RANK[a] <= PERMISSION_RIGHT_RANK[b] ? a : b
}

function grantHigher(map: PermissionMap, key: string, right: PermissionRight): void {
  const current = map[key]
  if (!current || PERMISSION_RIGHT_RANK[right] > PERMISSION_RIGHT_RANK[current]) {
    map[key] = right
  }
}

/** Base rights plus every area's keys; unknown areas are ignored here. */
export function expandMemberAreas(areas: MemberAreaPermissions): PermissionMap {
  const granted: PermissionMap = { ...BASE_MEMBER_PERMISSIONS }

  for (const [areaId, areaRight] of Object.entries(areas)) {
    const area = AREAS_BY_ID.get(areaId)
    if (!area) {
      continue
    }
    const right = lowerRight(areaRight, area.max_right)
    for (const { key, max } of area.keys) {
      grantHigher(granted, key, max ? lowerRight(right, max) : right)
    }
  }

  return granted
}

function invalid(message: string): MedusaError {
  return new MedusaError(
    MedusaError.Types.INVALID_DATA,
    message,
    MEMBER_PERMISSIONS_INVALID_CODE
  )
}

/**
 * Rejects unknown areas, rights above an area's maximum, grants whose catalog
 * dependencies are left unchecked, and anything beyond the granter's own
 * rights. Returns the grant without empty entries.
 */
export function validateMemberAreaPermissions(
  areas: MemberAreaPermissions,
  granted: PermissionMap,
  catalog: PermissionDefinition[]
): MemberAreaPermissions {
  const normalized: MemberAreaPermissions = {}

  for (const [areaId, right] of Object.entries(areas)) {
    const area = AREAS_BY_ID.get(areaId)
    if (!area) {
      throw invalid(`Unknown permission area: ${areaId}`)
    }
    if (PERMISSION_RIGHT_RANK[right] > PERMISSION_RIGHT_RANK[area.max_right]) {
      throw invalid(`Permission area ${areaId} allows at most ${area.max_right}`)
    }
    normalized[areaId] = right
  }

  const expanded = expandMemberAreas(normalized)
  const byKey = new Map(catalog.map((definition) => [definition.key, definition]))

  for (const [key, right] of Object.entries(expanded)) {
    const definition = byKey.get(key)
    if (!definition || !definition.surface.includes("vendor")) {
      throw invalid(`Permission ${key} is not a vendor permission`)
    }
    for (const requirement of definition.requires ?? []) {
      if (!satisfiesRight(expanded[requirement.key], requirement.right)) {
        throw invalid(
          `Permission ${key} requires ${requirement.key}:${requirement.right}`
        )
      }
    }
    if (!satisfiesRight(granted[key], right)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `You cannot grant ${key}:${right}`,
        MEMBER_PERMISSIONS_ESCALATION_CODE
      )
    }
  }

  return normalized
}
