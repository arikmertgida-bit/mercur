import { PropsWithChildren, useCallback, useMemo } from "react"
import {
  parsePermission,
  satisfiesPermission,
  type Permission,
  type PermissionKey,
  type PermissionMap,
  type PermissionRight,
  type PermissionsContextValue,
} from "@mercurjs/dashboard-sdk"
import { PermissionsContext } from "./permissions-context"
import {
  PermissionDescriptionContext,
  type DescribePermission,
} from "./permission-description"

export interface PermissionsProviderProps extends PropsWithChildren {
  /**
   * The actor's effective rights, read from `fields=+permissions`. Leave it
   * `null`/`undefined` when the API returned no `permissions` field: nothing is
   * being enforced, so every check passes.
   */
  permissions?: PermissionMap | null
  isLoading?: boolean
  /** Names a required permission on the access-denied page. Without it the page names none. */
  describePermission?: DescribePermission
  /** Who can grant a missing permission, shown on the access-denied page. */
  grantHint?: string
}

export const PermissionsProvider = ({
  permissions = null,
  isLoading = false,
  describePermission,
  grantHint,
  children,
}: PermissionsProviderProps) => {
  const isEnforced = !!permissions

  const can = useCallback(
    (key: PermissionKey, right: PermissionRight = "view") =>
      !permissions || satisfiesPermission(permissions, key, right),
    [permissions]
  )

  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!permissions) {
        return true
      }
      const parsed = parsePermission(permission)
      return !!parsed && satisfiesPermission(permissions, parsed.key, parsed.right)
    },
    [permissions]
  )

  const hasAnyPermission = useCallback(
    (list: Permission[]) => !permissions || list.some(hasPermission),
    [permissions, hasPermission]
  )

  const hasAllPermissions = useCallback(
    (list: Permission[]) => !permissions || list.every(hasPermission),
    [permissions, hasPermission]
  )

  const value: PermissionsContextValue = useMemo(
    () => ({
      permissions,
      isLoading,
      isEnforced,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      can,
    }),
    [permissions, isLoading, isEnforced, hasPermission, hasAnyPermission, hasAllPermissions, can]
  )

  const description = useMemo(
    () => (describePermission ? { describe: describePermission, grantHint } : null),
    [describePermission, grantHint]
  )

  return (
    <PermissionsContext.Provider value={value}>
      <PermissionDescriptionContext.Provider value={description}>
        {children}
      </PermissionDescriptionContext.Provider>
    </PermissionsContext.Provider>
  )
}
