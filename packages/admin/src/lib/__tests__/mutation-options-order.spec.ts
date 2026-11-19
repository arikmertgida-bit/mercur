import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { describe, expect, it } from "vitest"

// A mutation hook spreads the caller's options and keeps its own onSuccess
// (cache invalidation, which then calls options.onSuccess). When the spread
// comes after onSuccess, a caller passing onSuccess to the hook replaces the
// hook's onSuccess and the lists/details are never refreshed.
const SRC_DIRS = [
  fileURLToPath(new URL("../../", import.meta.url)),
  fileURLToPath(new URL("../../../../../apps/admin-test/src/", import.meta.url)),
]

export const findLateOptionSpreads = (
  fileName: string,
  source: string
): string[] => {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true
  )
  const findings: string[] = []

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "useMutation"
    ) {
      const [config] = node.arguments
      if (config && ts.isObjectLiteralExpression(config)) {
        const props = config.properties
        const ownOnSuccess = props.findIndex(
          (prop) =>
            (ts.isPropertyAssignment(prop) || ts.isMethodDeclaration(prop)) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === "onSuccess"
        )
        const spread = props.findIndex(ts.isSpreadAssignment)
        if (ownOnSuccess >= 0 && spread > ownOnSuccess) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart()
          )
          findings.push(`${fileName}:${line + 1}`)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return findings
}

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : sourceFiles(path)
    }
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })

describe("mutation hooks keep their own onSuccess", () => {
  it("flags a spread placed after onSuccess", () => {
    const late = `useMutation({ mutationFn: f, onSuccess: () => {}, ...options })`
    const early = `useMutation({ ...options, mutationFn: f, onSuccess: () => {} })`
    expect(findLateOptionSpreads("late.tsx", late)).toHaveLength(1)
    expect(findLateOptionSpreads("early.tsx", early)).toHaveLength(0)
  })

  it("spreads options before onSuccess everywhere", () => {
    const findings = SRC_DIRS.filter((dir) => existsSync(dir)).flatMap((dir) =>
      sourceFiles(dir).flatMap((file) =>
        findLateOptionSpreads(
          relative(dir, file),
          readFileSync(file, "utf8")
        )
      )
    )
    expect(findings).toEqual([])
  })
})
