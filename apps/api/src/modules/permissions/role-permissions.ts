import { PermissionMap, SellerRole } from "@mercurjs/types"

import { expandMemberAreas, ROLE_AREA_TEMPLATES } from "./member-areas"

/**
 * What each non-administration seller role may do: the role's area template
 * (member-areas.ts) expanded into catalog keys. The owner member and
 * role_seller_administration hold every vendor right and are not listed. A key
 * missing from a map means no access.
 */
type LimitedSellerRole = Exclude<SellerRole, SellerRole.SELLER_ADMINISTRATION>

export const SELLER_ROLE_PERMISSIONS: Record<LimitedSellerRole, PermissionMap> = {
  [SellerRole.ORDER_MANAGEMENT]: expandMemberAreas(ROLE_AREA_TEMPLATES[SellerRole.ORDER_MANAGEMENT]),
  [SellerRole.INVENTORY_MANAGEMENT]: expandMemberAreas(ROLE_AREA_TEMPLATES[SellerRole.INVENTORY_MANAGEMENT]),
  [SellerRole.ACCOUNTING]: expandMemberAreas(ROLE_AREA_TEMPLATES[SellerRole.ACCOUNTING]),
  [SellerRole.SUPPORT]: expandMemberAreas(ROLE_AREA_TEMPLATES[SellerRole.SUPPORT]),
}

export function isLimitedSellerRole(role: string): role is LimitedSellerRole {
  return Object.prototype.hasOwnProperty.call(SELLER_ROLE_PERMISSIONS, role)
}
