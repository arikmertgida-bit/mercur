import { readFileSync, readdirSync, statSync } from "fs"
import { builtinModules } from "module"
import { join } from "path"
import { z } from "zod"

// The backend image installs only the production tree of @acme/api, so a
// package that core's runtime code imports but lists only in devDependencies is
// missing in production ("Cannot find module '@medusajs/core-flows'").
const CORE_ROOT = join(__dirname, "..", "..")
const SRC_ROOT = join(CORE_ROOT, "src")

const PackageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),
})

const IMPORT_PATTERN =
  /(?:^|\s)(?:import|export)\s(?!type\s)[^'"]*?from\s+["']([^"'.][^"']*)["']|require(?:\.resolve)?\(\s*["']([^"'.][^"']*)["']|import\(\s*["']([^"'.][^"']*)["']/g

const isTestPath = (path: string): boolean =>
  /[\\/]__tests__[\\/]|[\\/]__fixtures__[\\/]|\.spec\.ts$|\.test\.ts$/.test(path)

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      return collectSourceFiles(path)
    }
    return path.endsWith(".ts") && !path.endsWith(".d.ts") && !isTestPath(path)
      ? [path]
      : []
  })

const toPackageName = (specifier: string): string => {
  const parts = specifier.split("/")
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
}

const readDeclaredPackages = (): Set<string> => {
  let raw: string
  try {
    raw = readFileSync(join(CORE_ROOT, "package.json"), "utf8")
  } catch (error) {
    throw new Error(`packages/core/package.json unreadable: ${String(error)}`)
  }
  let parsed: z.infer<typeof PackageJsonSchema>
  try {
    parsed = PackageJsonSchema.parse(JSON.parse(raw))
  } catch (error) {
    throw new Error(`packages/core/package.json invalid: ${String(error)}`)
  }
  return new Set([
    ...Object.keys(parsed.dependencies),
    ...Object.keys(parsed.peerDependencies),
  ])
}

const SELF_PACKAGE = "@mercurjs/core"
// Resolved from the consuming project's cwd at runtime, never from core.
const CWD_RESOLVED = new Set(["@mercurjs/cli"])
// Type declarations only; the compiled output never requires it.
const TYPE_ONLY = new Set(["@medusajs/types"])

describe("packages/core runtime dependencies", () => {
  it("declares every package its non-test source imports at runtime", () => {
    const declared = readDeclaredPackages()
    const builtins = new Set(builtinModules)
    const missing = new Map<string, string>()

    for (const file of collectSourceFiles(SRC_ROOT)) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(IMPORT_PATTERN)) {
        const specifier = match[1] ?? match[2] ?? match[3]
        if (!specifier || specifier.startsWith("node:")) {
          continue
        }
        const name = toPackageName(specifier)
        if (
          builtins.has(name) ||
          name === SELF_PACKAGE ||
          CWD_RESOLVED.has(name) ||
          TYPE_ONLY.has(name) ||
          declared.has(name) ||
          missing.has(name)
        ) {
          continue
        }
        missing.set(name, file.slice(CORE_ROOT.length + 1))
      }
    }

    expect(Object.fromEntries(missing)).toEqual({})
  })
})
