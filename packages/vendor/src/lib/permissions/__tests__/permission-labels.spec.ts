import fs from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

import {
  PERMISSION_KEY_OTHER_LABELS,
  describePermissionKey,
} from "../permission-labels"

/**
 * The access-denied page names a required permission instead of printing the
 * raw `key:right`. Every permission the panel declares must have a name, and
 * every name must exist in all 31 locales.
 */

const SRC = path.resolve(__dirname, "../../..")
const APP_ROUTES = path.resolve(SRC, "../../../apps/vendor/src")
const TRANSLATIONS = path.resolve(SRC, "i18n/translations")

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "node_modules" ? [] : sourceFiles(full)
    }
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })

const PERMISSION_LITERAL = /["']([a-z_]+(?:\.[a-z_]+)?):(view|edit|manage)["']/g

const declaredPermissions = (): string[] => {
  const found = new Set<string>()
  for (const file of [...sourceFiles(SRC), ...sourceFiles(APP_ROUTES)]) {
    const code = fs
      .readFileSync(file, "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
    for (const match of code.matchAll(PERMISSION_LITERAL)) {
      found.add(`${match[1]}:${match[2]}`)
    }
  }
  return [...found].sort()
}

const locales = fs
  .readdirSync(TRANSLATIONS)
  .filter((file) => /^[a-zA-Z]+\.json$/.test(file))
  .map((file) => ({
    name: file.replace(".json", ""),
    json: JSON.parse(fs.readFileSync(path.join(TRANSLATIONS, file), "utf-8")),
  }))

const lookup = (json: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>(
    (node, part) =>
      node && typeof node === "object" && part in node
        ? (node as Record<string, unknown>)[part]
        : undefined,
    json
  )

describe("access-denied permission names", () => {
  const permissions = declaredPermissions()

  test("the panel declares permissions", () => {
    expect(permissions.length).toBeGreaterThan(40)
  })

  test.each(permissions)("%s has a name", (permission) => {
    const [key, right] = permission.split(":")
    const label = describePermissionKey(key, right as "view" | "edit" | "manage")
    expect(label).not.toBeNull()
  })

  test("rights beyond a row's checkbox are administration only", () => {
    expect(describePermissionKey("payout_accounts", "edit")?.administrationOnly).toBe(true)
    expect(describePermissionKey("members", "view")?.administrationOnly).toBe(true)
    expect(describePermissionKey("store", "edit")?.administrationOnly).toBe(true)
    expect(describePermissionKey("store", "view")?.administrationOnly).toBe(false)
    expect(describePermissionKey("product_categories", "view")).toEqual({
      labelKey: "users.permissions.areas.catalog",
      right: "view",
      administrationOnly: false,
    })
    expect(describePermissionKey("unknown_key", "view")).toBeNull()
  })

  test("31 locales", () => {
    expect(locales).toHaveLength(31)
  })

  const labelKeys = [
    ...new Set(
      permissions.flatMap((permission) => {
        const [key, right] = permission.split(":")
        const label = describePermissionKey(key, right as "view" | "edit" | "manage")
        return label ? [label.labelKey] : []
      })
    ),
    ...Object.values(PERMISSION_KEY_OTHER_LABELS).map((name) => `users.permissions.otherAreas.${name}`),
    "users.permissions.administrationOnlyItem",
    "users.permissions.requiredItem",
    "permissions.accessDenied.grantHint",
  ]

  test.each(locales.map((locale) => [locale.name, locale.json]))(
    "%s names every required permission",
    (_name, json) => {
      for (const key of labelKeys) {
        const value = lookup(json, key)
        expect(typeof value === "string" && value.trim().length > 0, key).toBe(true)
      }
      expect(lookup(json, "users.permissions.administrationOnlyItem")).toContain("{{area}}")
    }
  )
})
