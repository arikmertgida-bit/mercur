import fs from "fs"
import path from "path"
import { PermissionRequirement } from "@mercurjs/types"
import { REQUIRED_PERMISSION } from "@mercurjs/core/api/utils/permissions-middleware"
import { getPermission } from "@mercurjs/core/permissions/registry"

import { vendorRoutePermissionMiddlewares } from "../permission-middlewares"

const VENDOR_DIR = path.join(__dirname, "..")
const METHODS = ["GET", "POST", "DELETE"] as const

type RouteFile = { url: string; methods: string[] }

const crawl = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : crawl(full)
    }
    return entry.name === "route.ts" ? [full] : []
  })

const routeFiles = (): RouteFile[] =>
  crawl(VENDOR_DIR).map((file) => {
    const content = fs.readFileSync(file, "utf-8")
    const relative = path
      .relative(VENDOR_DIR, path.dirname(file))
      .replace(/\\/g, "/")
      .replace(/\[([^\]]+)\]/g, ":$1")
    return {
      url: `/vendor/${relative}`,
      methods: METHODS.filter((method) =>
        new RegExp(`export\\s+(const|async function|function)\\s+${method}\\b`).test(content)
      ),
    }
  })

const requirementOf = (
  middleware: (...args: never[]) => unknown
): PermissionRequirement | undefined =>
  Reflect.get(middleware, REQUIRED_PERMISSION)

const requirementsFor = (url: string, method: string): PermissionRequirement[] =>
  vendorRoutePermissionMiddlewares
    .filter((route) => {
      const methods = Array.isArray(route.method) ? route.method : [route.method]
      return route.matcher === url && methods.includes(method as never)
    })
    .flatMap((route) => route.middlewares ?? [])
    .map(requirementOf)
    .filter((requirement): requirement is PermissionRequirement => !!requirement)

describe("Kayı vendor route permissions", () => {
  it("every Kayı vendor route declares a member permission", () => {
    const routes = routeFiles()
    expect(routes.flatMap((route) => route.methods).length).toBeGreaterThanOrEqual(26)

    const missing = routes.flatMap((route) =>
      route.methods
        .filter((method) => !requirementsFor(route.url, method).length)
        .map((method) => `${method} ${route.url}`)
    )

    expect(missing).toEqual([])
  })

  it("only references vendor permissions that exist with that right", () => {
    const unknown = vendorRoutePermissionMiddlewares
      .flatMap((route) => route.middlewares ?? [])
      .map(requirementOf)
      .filter((requirement): requirement is PermissionRequirement => !!requirement)
      .filter((requirement) => {
        const definition = getPermission(requirement.key)
        return (
          !definition ||
          !definition.surface.includes("vendor") ||
          !definition.rights.includes(requirement.right)
        )
      })
      .map((requirement) => `${requirement.key}:${requirement.right}`)

    expect(unknown).toEqual([])
  })
})
