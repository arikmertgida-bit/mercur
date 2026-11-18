export type PermissionRight = "view" | "edit" | "manage"

export const PERMISSION_RIGHTS: readonly PermissionRight[] = [
  "view",
  "edit",
  "manage",
]

export const PERMISSION_RIGHT_RANK: Record<PermissionRight, number> = {
  view: 1,
  edit: 2,
  manage: 3,
}

export type PermissionSurface = "admin" | "vendor"

export interface PermissionRequirement {
  key: string
  right: PermissionRight
}

export interface PermissionDefinition {
  key: string
  group: string
  surface: PermissionSurface[]
  rights: PermissionRight[]
  requires?: PermissionRequirement[]
  label?: string
  description?: string
}

export type PermissionMap = Record<string, PermissionRight>

/**
 * A seller member's own grant keyed by permission AREA (a row of the invite
 * checkbox table), not by catalog key; null means the role template applies.
 * The app's permissions module expands areas into catalog keys.
 */
export type MemberAreaPermissions = Record<string, PermissionRight>

export interface PermissionActor {
  actor_type: string
  actor_id: string
  surface: PermissionSurface
  seller_id?: string
  seller_member_id?: string
  seller_member_role_id?: string | null
  seller_member_is_owner?: boolean
  seller_member_permissions?: MemberAreaPermissions | null
}

export interface ValidateMemberPermissionsInput {
  permissions: MemberAreaPermissions
  /** Rights of whoever grants them; nothing beyond these may be given. */
  granted: PermissionMap
  catalog: PermissionDefinition[]
}

/**
 * Implemented by the service of the module registered under
 * `PERMISSIONS_MODULE` in the Medusa config. Without that module, core grants
 * everything.
 */
export interface IPermissionResolver {
  resolvePermissions(
    actor: PermissionActor,
    catalog: PermissionDefinition[]
  ): Promise<PermissionMap>
  /**
   * Checks an area grant before it is stored on an invite or member and
   * returns it normalized; throws a MedusaError when an area or right is not
   * grantable, a dependency is missing or the grant exceeds `granted`.
   * Without it, custom member permissions are rejected.
   */
  validateMemberPermissions?(
    input: ValidateMemberPermissionsInput
  ): MemberAreaPermissions
}

export const PERMISSIONS_MODULE = "permissions"

export const MISSING_PERMISSION_CODE = "MISSING_PERMISSION"
