import type {
  OrchestratorBuilder,
  TransactionModelOptions,
  TransactionStepsDefinition,
  WorkflowHandler,
} from "@medusajs/framework/orchestration"
import Module from "module"
import { join } from "path"

import type { PatchedFile } from "./apply-patch"

// `module._compile` is how Node's own `.js` loader evaluates a file; it is not
// part of the public typings, so its presence is checked at runtime.
type CompilableModule = NodeJS.Module & {
  _compile(source: string, filename: string): void
}

function isCompilable(module: NodeJS.Module): module is CompilableModule {
  return "_compile" in module && typeof module._compile === "function"
}

type ModuleExports = NodeJS.Module["exports"]
type ExportsObject = Record<string, ModuleExports>

/** Absolute file path -> patched source, consulted on every `.js` load. */
const overrides = new Map<string, string>()

/** Paths whose patched source was actually compiled, not merely registered. */
const compiled = new Set<string>()

let installed = false

// Patches are applied in memory rather than written to `node_modules`: a server
// boot has no business mutating installed packages, workers would race each
// other doing it, and a file already required cannot be un-required cleanly.
// Intercepting the loader keeps the change scoped to this process.
function install(): void {
  if (installed) return

  // `require.extensions` is the same object as Node's internal
  // `Module._extensions`, and the typed handle on it.
  const original = require.extensions[".js"]

  require.extensions[".js"] = function (module, filename) {
    const patched = overrides.get(filename)
    if (patched !== undefined) {
      if (!isCompilable(module)) {
        throw new Error(
          `Cannot apply the patch to ${filename}: the Node module loader does not expose _compile`
        )
      }
      module._compile(patched, filename)
      compiled.add(filename)
      return
    }
    original(module, filename)
  }

  installed = true
}

/**
 * Files whose patched source was compiled in place of the original. Registering
 * an override only takes effect if the module is required afterwards, so this
 * is the difference between a patch being staged and a patch being live.
 */
export function compiledPaths(): string[] {
  return [...compiled]
}

export function isAlreadyLoaded(absolutePath: string): boolean {
  return Object.prototype.hasOwnProperty.call(require.cache, absolutePath)
}

export function isOverridden(absolutePath: string): boolean {
  return overrides.has(absolutePath)
}

export function registerOverrides(
  packageDir: string,
  files: PatchedFile[],
  resolve: (packageDir: string, relativePath: string) => string
): void {
  install()

  for (const file of files) {
    overrides.set(resolve(packageDir, file.relativePath), file.source)
  }
}

// `@mercurjs/core` is not always the first thing to pull in a target package —
// `@medusajs/test-utils` requires core-flows before it loads the config. A module already in the cache would keep its
// unpatched source forever, so the patched files are evicted and required again
// through the override above.
//
// Only the patched files are dropped, never the whole package: re-running an
// arbitrary core-flows module re-enters `createWorkflow`, and workflows whose
// step ids are generated rather than literal do not survive a second
// registration ("step definition already exists").
export function purgeFiles(absolutePaths: string[]): void {
  for (const filename of absolutePaths) {
    const cached = require.cache[filename]
    if (!cached) continue

    delete require.cache[filename]

    // Parents keep `children` arrays pointing at the evicted module; leaving it
    // there keeps the stale exports reachable through the module graph.
    for (const parent of Object.values(require.cache)) {
      const children = parent?.children
      if (!children) continue
      const index = children.indexOf(cached)
      if (index !== -1) children.splice(index, 1)
    }
  }
}

// `@medusajs/orchestration` exports `WorkflowManager` untyped; these are the
// two static methods used here, with the signatures of its implementation.
type WorkflowManagerLike = {
  register: (
    workflowId: string,
    flow: TransactionStepsDefinition | OrchestratorBuilder | undefined,
    handlers: WorkflowHandler,
    options?: TransactionModelOptions,
    requiredModules?: Set<string>,
    optionalModules?: Set<string>
  ) => void
  unregister: (workflowId: string) => void
}

function isWorkflowManager(value: ModuleExports): value is WorkflowManagerLike {
  return (
    typeof value?.register === "function" &&
    typeof value?.unregister === "function"
  )
}

/**
 * Compiles the patched sources now, so the override is what the process holds.
 *
 * Re-running a module that calls `createWorkflow` hits Medusa's duplicate guard,
 * which only lets a workflow re-register when its step definition is byte-equal
 * — and step ids are generated, so a second load of the same file is not. The
 * reload replays the same source, so replacing the previous definition is the
 * correct outcome; `register` is swapped for the duration to say so.
 */
export function reload(packageDir: string, absolutePaths: string[]): void {
  const manager = loadWorkflowManager(packageDir)
  const original = manager?.register

  if (manager && original) {
    manager.register = function register(workflowId, ...rest) {
      manager.unregister(workflowId)
      return original.call(manager, workflowId, ...rest)
    }
  }

  try {
    for (const filename of absolutePaths) {
      require(filename)
    }
  } finally {
    if (manager && original) manager.register = original
  }
}

/**
 * Evicts already-loaded files and compiles their patched source in place.
 *
 * Eviction alone does not reach code that required the package earlier: every
 * index above a patched file re-exports it through a getter over the evicted
 * module's `exports` object, so `require("@medusajs/core-flows")` keeps handing
 * out the unpatched workflow. Copying the fresh exports onto that stale object
 * is what makes the patch visible through the whole re-export chain.
 */
export function replaceLoaded(packageDir: string, absolutePaths: string[]): void {
  const previous = new Map<string, ModuleExports>()
  for (const filename of absolutePaths) {
    previous.set(filename, require.cache[filename]?.exports)
  }

  purgeFiles(absolutePaths)
  reload(packageDir, absolutePaths)

  for (const [filename, stale] of previous) {
    const fresh: ModuleExports = require.cache[filename]?.exports
    if (isObject(stale) && isObject(fresh) && stale !== fresh) {
      adoptExports(stale, fresh)
    }
  }
}

function isObject(value: ModuleExports): value is ExportsObject {
  return typeof value === "object" && value !== null
}

function adoptExports(stale: ExportsObject, fresh: ExportsObject): void {
  for (const key of Object.keys(fresh)) {
    const descriptor = Object.getOwnPropertyDescriptor(stale, key)

    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(stale, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: fresh[key],
      })
    } else if (descriptor.writable) {
      stale[key] = fresh[key]
    }
  }
}

// Resolved from the patched package, not from `@mercurjs/core`: bun and pnpm
// give each dependent its own copy, and a `WorkflowManager` from a different
// copy holds a different registry than the one `createWorkflow` writes to.
function loadWorkflowManager(packageDir: string): WorkflowManagerLike | null {
  try {
    const requireFrom = Module.createRequire(join(packageDir, "index.js"))
    const orchestration: ModuleExports = requireFrom("@medusajs/orchestration")
    const manager: ModuleExports = orchestration?.WorkflowManager
    return isWorkflowManager(manager) ? manager : null
  } catch {
    return null
  }
}
