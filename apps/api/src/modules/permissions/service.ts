import {
  IPermissionResolver,
  MemberAreaPermissions,
  PermissionActor,
  PermissionDefinition,
  PermissionMap,
  SellerRole,
  ValidateMemberPermissionsInput,
} from "@mercurjs/types"
import { grantAll } from "@mercurjs/core/permissions/registry"

import { isLimitedSellerRole, SELLER_ROLE_PERMISSIONS } from "./role-permissions"
import {
  expandMemberAreas,
  validateMemberAreaPermissions,
} from "./member-areas"

// Admin routes accept a user session or a secret API key; both are operators.
const ADMIN_ACTOR_TYPES = new Set(["user", "api-key"])
const VENDOR_ACTOR_TYPE = "member"

function forSurface(
  catalog: PermissionDefinition[],
  surface: PermissionActor["surface"]
): PermissionDefinition[] {
  return catalog.filter((definition) => definition.surface.includes(surface))
}

/**
 * Admin users and secret API keys keep every right (operators have no role split). A seller's
 * owner and administration members get every vendor right. Other members get
 * the grant their inviter checked (custom_permissions) or, without one, their
 * role row from SELLER_ROLE_PERMISSIONS. Anything unknown gets nothing.
 */
export function resolveActorPermissions(
  actor: PermissionActor,
  catalog: PermissionDefinition[]
): PermissionMap {
  if (actor.surface === "admin") {
    return ADMIN_ACTOR_TYPES.has(actor.actor_type)
      ? grantAll(forSurface(catalog, "admin"))
      : {}
  }

  if (actor.actor_type !== VENDOR_ACTOR_TYPE || !actor.seller_member_id) {
    return {}
  }

  const vendorCatalog = forSurface(catalog, "vendor")

  if (
    actor.seller_member_is_owner ||
    actor.seller_member_role_id === SellerRole.SELLER_ADMINISTRATION
  ) {
    return grantAll(vendorCatalog)
  }

  const role = actor.seller_member_role_id
  if (!role || !isLimitedSellerRole(role)) {
    return {}
  }

  const rolePermissions = actor.seller_member_permissions
    ? expandMemberAreas(actor.seller_member_permissions)
    : SELLER_ROLE_PERMISSIONS[role]
  const granted: PermissionMap = {}
  for (const definition of vendorCatalog) {
    const right = rolePermissions[definition.key]
    if (right && definition.rights.includes(right)) {
      granted[definition.key] = right
    }
  }
  return granted
}

class PermissionsModuleService implements IPermissionResolver {
  async resolvePermissions(
    actor: PermissionActor,
    catalog: PermissionDefinition[]
  ): Promise<PermissionMap> {
    return resolveActorPermissions(actor, catalog)
  }

  validateMemberPermissions({
    permissions,
    granted,
    catalog,
  }: ValidateMemberPermissionsInput): MemberAreaPermissions {
    return validateMemberAreaPermissions(permissions, granted, catalog)
  }
}

export default PermissionsModuleService
