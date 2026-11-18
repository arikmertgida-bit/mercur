import "@mercurjs/core/permissions/index"
import {
  getPermission,
  getPermissionCatalog,
  satisfiesRight,
} from "@mercurjs/core/permissions/registry"
import { PermissionActor, PermissionMap, SellerRole } from "@mercurjs/types"

import "../../../permissions"
import { SELLER_ROLE_PERMISSIONS } from "../role-permissions"
import { resolveActorPermissions } from "../service"

const member = (
  role: string | null,
  is_owner = false
): PermissionActor => ({
  actor_type: "member",
  actor_id: "mem_1",
  surface: "vendor",
  seller_id: "sel_1",
  seller_member_id: "selmem_1",
  seller_member_role_id: role,
  seller_member_is_owner: is_owner,
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
})
