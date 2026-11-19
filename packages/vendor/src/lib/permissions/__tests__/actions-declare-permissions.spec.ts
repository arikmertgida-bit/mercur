import fs from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

/**
 * A member only sees the actions their permissions allow (9e-3b-3c): an
 * action menu or a "create" link without a permission is shown to everyone
 * and lands a limited member on "Access denied" or a 403. Every page that
 * renders one must gate it (`permission` on the action, `PermissionAction`,
 * or `useCan`). The exceptions below are reached only through a route that
 * already requires the right.
 */

const SRC = path.resolve(__dirname, "../../..")
const ROOTS = [path.join(SRC, "pages"), path.resolve(SRC, "../../../apps/vendor/src/routes")]

const UNGATED_BY_DESIGN: Record<string, string> = {
  "pages/orders/[id]/edit/_components/order-edit-create-form/order-edit-item.tsx": "inside the order edit form (orders.edits:edit route)",
  "pages/orders/[id]/exchanges/create/_components/exchange-create-form/exchange-outbound-item.tsx": "inside the exchange form (orders route gate)",
  "pages/orders/[id]/claims/create/_components/claim-create-form/claim-outbound-item.tsx": "inside the claim form (orders route gate)",
  "pages/settings/profile/profile-detail/components/profile-general-section/profile-general-section.tsx": "the member's own profile",
}

const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : files(full)
    }
    return entry.name.endsWith(".tsx") ? [full] : []
  })

const relative = (file: string): string =>
  file.startsWith(SRC) ? path.relative(SRC, file).split(path.sep).join("/") : path.relative(path.resolve(SRC, "../../.."), file).split(path.sep).join("/")

const GATE = /permission[:=]|PermissionAction|useCan\(|usePermissionGate\(/
const withoutComments = (source: string): string =>
  source.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const offenders = ROOTS.flatMap(files).filter((file) => {
  const source = withoutComments(fs.readFileSync(file, "utf-8"))
  const hasActions = /<ActionMenu\b/.test(source) || /<Link\s+to="create"/.test(source)
  return hasActions && !GATE.test(source) && !(relative(file) in UNGATED_BY_DESIGN)
})

describe("vendor actions declare their permission", () => {
  test("scans the vendor pages", () => {
    expect(ROOTS.flatMap(files).length).toBeGreaterThan(300)
  })

  test("no action menu or create link is shown without a permission check", () => {
    expect(offenders.map(relative)).toEqual([])
  })

  test("every exception still exists", () => {
    for (const file of Object.keys(UNGATED_BY_DESIGN)) {
      expect(fs.existsSync(path.join(SRC, file)), file).toBe(true)
    }
  })
})
