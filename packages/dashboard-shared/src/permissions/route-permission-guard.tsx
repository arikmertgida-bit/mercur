import { ExclamationCircle } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Outlet, useMatches } from "react-router-dom"
import type { Permission } from "@mercurjs/dashboard-sdk"
import { z } from "zod"
import { usePermissions } from "./use-permissions"

type ResolvedRequirement = {
  permissions: Permission[]
  requireAll: boolean
  redirectTo?: string
}

// Permissions only have to be strings here: a malformed one is kept and denies
// access through the permission check, rather than dropping the requirement.
const PermissionSchema = z.custom<Permission>(
  (value) => typeof value === "string"
)

// The part of `RouteHandle` the guard reads. Optional fields that are not
// well-formed fall back to their defaults instead of voiding the requirement.
const RouteHandleRequirementSchema = z.object({
  permissions: z.union([PermissionSchema, z.array(PermissionSchema)]).optional(),
  requireAll: z.boolean().optional().catch(undefined),
  redirectTo: z.string().optional().catch(undefined),
})

const PERMISSIONS_KEY = "permissions"

const readRequirementFromHandle = (
  parsed: ReturnType<typeof RouteHandleRequirementSchema.safeParse>
): ResolvedRequirement | undefined => {
  if (!parsed.success) {
    // A route without a handle is not an error; a handle declaring
    // non-string permissions is a misconfiguration worth surfacing.
    if (parsed.error.issues.some((issue) => issue.path[0] === PERMISSIONS_KEY)) {
      reportError(
        new Error(
          `Invalid permissions: all permissions must be strings (${parsed.error.message})`
        )
      )
    }
    return undefined
  }

  const declared = parsed.data
  const rawPermissions = declared.permissions
  if (!rawPermissions) {
    return undefined
  }

  const permissions = Array.isArray(rawPermissions)
    ? rawPermissions
    : [rawPermissions]

  if (!permissions.length) {
    return undefined
  }

  return {
    permissions,
    requireAll: declared.requireAll ?? true,
    redirectTo: declared.redirectTo,
  }
}

/**
 * Route-level guard. Mount as a route's `element` and declare the requirement
 * on the route's `handle`. Unlike `PermissionGuard`, `requireAll` defaults to
 * `true` here.
 *
 * @example
 * ```tsx
 * {
 *   path: "roles",
 *   element: <RoutePermissionGuard />,
 *   handle: { permissions: "roles:view" },
 *   children: [...],
 * }
 * ```
 */
export const RoutePermissionGuard = () => {
  const matches = useMatches()
  const { hasAnyPermission, hasAllPermissions, isLoading } = usePermissions()

  // Deepest match wins so a child route can override its parent.
  const requirement = useMemo(() => {
    for (let i = matches.length - 1; i >= 0; i--) {
      const found = readRequirementFromHandle(
        RouteHandleRequirementSchema.safeParse(matches[i].handle)
      )
      if (found) {
        return found
      }
    }
    return undefined
  }, [matches])

  if (isLoading || !requirement) {
    return <Outlet />
  }

  const hasAccess = requirement.requireAll
    ? hasAllPermissions(requirement.permissions)
    : hasAnyPermission(requirement.permissions)

  if (!hasAccess) {
    if (requirement.redirectTo) {
      return <Navigate to={requirement.redirectTo} replace />
    }

    return <AccessDenied requirement={requirement} />
  }

  return <Outlet />
}

const AccessDenied = ({
  requirement,
}: {
  requirement: ResolvedRequirement
}) => {
  const { t } = useTranslation()

  return (
    <div className="bg-ui-bg-subtle absolute bottom-0 left-0 right-0 top-0 flex min-h-screen items-center justify-center p-4">
      <Container className="max-w-md">
        <div className="flex flex-col items-center gap-y-4 py-8 text-center">
          <div className="bg-ui-bg-subtle flex h-12 w-12 items-center justify-center rounded-full">
            <ExclamationCircle className="text-ui-fg-muted" />
          </div>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">{t("permissions.accessDenied.title")}</Heading>
            <Text className="text-ui-fg-subtle">
              {t("permissions.accessDenied.description")}
            </Text>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            {t("permissions.accessDenied.requiredPermission", {
              permission: requirement.permissions.join(", "),
            })}
          </Text>
        </div>
      </Container>
    </div>
  )
}
