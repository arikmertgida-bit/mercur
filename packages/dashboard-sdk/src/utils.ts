import fs from "fs"
import path from "path"
import type { ParserOptions } from "@babel/parser"
import { traverse, type TraverseRoot } from "./babel"
import { VALID_FILE_EXTENSIONS } from "./constants"
import type { MedusaConfigShape } from "./types"

type NestedDefaultExport<T extends object> = T & {
    default?: NestedDefaultExport<T>
}

export function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/")
}

/**
 * Recursively collect component/config files under a surface folder, skipping
 * declaration files, barrels (`index.*`), and underscore-prefixed helpers.
 */
export function crawlModuleFiles(dir: string): string[] {
    const files: string[] = []
    if (!fs.existsSync(dir)) return files

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...crawlModuleFiles(full))
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name)
            const base = path.basename(entry.name, ext)
            if (base.endsWith(".d")) continue
            if (base.startsWith("_") || base === "index") continue
            if (VALID_FILE_EXTENSIONS.includes(ext)) files.push(full)
        }
    }
    return files
}

export function getParserOptions(file: string): ParserOptions {
    const options: ParserOptions = {
        sourceType: "module",
        plugins: ["jsx"],
    }

    if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        options.plugins!.push("typescript")
    }

    return options
}

export function resolveExports<T extends object>(
    moduleExports: NestedDefaultExport<T>,
): T {
    if (
        "default" in moduleExports &&
        moduleExports.default &&
        "default" in moduleExports.default
    ) {
        return resolveExports(moduleExports.default)
    }
    return moduleExports
}

export async function getFileExports(
    filePath: string,
): Promise<NestedDefaultExport<MedusaConfigShape>> {
    const { unregister } = await safeRegister()
    const module = require(filePath)
    unregister()

    return resolveExports(module)
}

export const safeRegister = async () => {
    const { register } = await import("esbuild-register/dist/node")
    let res: { unregister: () => void }
    try {
        res = register({
            format: "cjs",
            loader: "ts",
        })
    } catch {
        res = {
            unregister: () => {},
        }
    }

    return res
}

export function hasDefaultExport(ast: TraverseRoot): boolean {
    let found = false

    traverse(ast, {
        ExportDefaultDeclaration() {
            found = true
        },
        AssignmentExpression(nodePath) {
            if (
                nodePath.node.type === "AssignmentExpression" &&
                nodePath.node.left.type === "MemberExpression" &&
                nodePath.node.left.object.type === "Identifier" &&
                nodePath.node.left.object.name === "exports" &&
                nodePath.node.left.property.type === "Identifier" &&
                nodePath.node.left.property.name === "default"
            ) {
                found = true
            }
        },
        ExportNamedDeclaration(nodePath) {
            if (nodePath.node.type !== "ExportNamedDeclaration") return
            const specifiers = nodePath.node.specifiers
            if (
                specifiers?.some(
                    (s) =>
                        s.type === "ExportSpecifier" &&
                        s.exported.type === "Identifier" &&
                        s.exported.name === "default"
                )
            ) {
                found = true
            }
        },
    })

    return found
}
