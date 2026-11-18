import { AuthenticatedMedusaRequest } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { MemberAreaPermissions, SellerRole } from "@mercurjs/types"

import { getPermissionCatalog } from "../../permissions"
import { getPermissionResolver } from "./permissions-middleware"
import { MEMBER_PERMISSIONS_INVALID_CODE } from "./vendor-error-codes"

/**
 * Checks a member's checkbox grant against the app's permissions module before
 * it is stored. null keeps the role template. The administration role is
 * always full, so it takes no grant.
 */
export function validateMemberPermissionsInput(
  req: AuthenticatedMedusaRequest,
  roleId: string,
  permissions: MemberAreaPermissions | null | undefined
): MemberAreaPermissions | null {
  if (!permissions) {
    return null
  }

  const resolver = getPermissionResolver(req)

  if (
    roleId === SellerRole.SELLER_ADMINISTRATION ||
    !resolver?.validateMemberPermissions
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "These permissions cannot be granted to a member.",
      MEMBER_PERMISSIONS_INVALID_CODE
    )
  }

  return resolver.validateMemberPermissions({
    permissions,
    granted: req.permissions ?? {},
    catalog: getPermissionCatalog(),
  })
}
