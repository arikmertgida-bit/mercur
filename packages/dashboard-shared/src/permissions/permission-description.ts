import { createContext } from "react"
import {
  parsePermission,
  type Permission,
  type PermissionRight,
} from "@mercurjs/dashboard-sdk"

/** A translated name for a required permission, or `null` when the panel has none. */
export type DescribePermission = (key: string, right: PermissionRight) => string | null

export interface PermissionDescription {
  describe: DescribePermission
  /** Shown under the required permissions: who can grant them. */
  grantHint?: string
}

export const PermissionDescriptionContext =
  createContext<PermissionDescription | null>(null)

const toLocaleTag = (language: string): string =>
  language.replace(/^([a-z]{2})([A-Z]{2})$/, "$1-$2")

/**
 * Names the required permissions in the reader's language ("A, B and C" /
 * "A or B"). Returns `null` unless every one of them has a name, so a raw
 * permission key is never shown.
 */
export const formatRequiredPermissions = (
  permissions: Permission[],
  describe: DescribePermission,
  language: string,
  requireAll: boolean
): string | null => {
  const names: string[] = []
  for (const permission of permissions) {
    const parsed = parsePermission(permission)
    const name = parsed && describe(parsed.key, parsed.right)
    if (!name) {
      return null
    }
    if (!names.includes(name)) {
      names.push(name)
    }
  }

  if (!names.length) {
    return null
  }

  return formatNameList(names, language, requireAll ? "conjunction" : "disjunction")
}

/** "A, B and C" in the reader's language; panel codes such as `ptBR` are accepted. */
export const formatNameList = (
  names: string[],
  language: string,
  type: "conjunction" | "disjunction" | "unit" = "unit"
): string => {
  try {
    return new Intl.ListFormat(toLocaleTag(language), { type }).format(names)
  } catch {
    return new Intl.ListFormat("en", { type }).format(names)
  }
}
