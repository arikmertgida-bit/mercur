import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { describe, expect, it } from "vitest"

// react-hook-form 7.88 memoizes the FormProvider value on formState, so the
// object returned by useFormContext()/useTabbedForm() changes on every form
// update. A hook that lists it as a dependency and writes to the form re-runs
// forever; on /promotions/create that starved React Router's blocker update
// and the modal could not be closed. Depend on the methods (form.setValue).
const FORM_CONTEXT_HOOKS = new Set(["useFormContext", "useTabbedForm"])
const DEPENDENCY_HOOKS = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useMemo",
  "useCallback",
])

const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url))

const calleeName = (call: ts.CallExpression): string => {
  const { expression } = call
  if (ts.isIdentifier(expression)) {
    return expression.text
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text
  }
  return ""
}

const formContextBindings = (fn: ts.SignatureDeclaration): Set<string> => {
  const names = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (node !== fn && ts.isFunctionLike(node)) {
      return
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      FORM_CONTEXT_HOOKS.has(calleeName(node.initializer))
    ) {
      names.add(node.name.text)
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(fn, visit)
  return names
}

export const findUnstableFormDependencies = (
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

  const checkFunction = (fn: ts.SignatureDeclaration): void => {
    const unstable = formContextBindings(fn)
    if (!unstable.size) {
      return
    }
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        DEPENDENCY_HOOKS.has(calleeName(node))
      ) {
        const deps = node.arguments[1]
        if (deps && ts.isArrayLiteralExpression(deps)) {
          for (const element of deps.elements) {
            if (ts.isIdentifier(element) && unstable.has(element.text)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(
                element.getStart()
              )
              findings.push(`${fileName}:${line + 1} ${element.text}`)
            }
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    ts.forEachChild(fn, visit)
  }

  const walk = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) {
      checkFunction(node)
    }
    ts.forEachChild(node, walk)
  }
  walk(sourceFile)

  return findings
}

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(path)
    }
    return /\.tsx?$/.test(entry.name) && !/\.(spec|test)\.tsx?$/.test(entry.name)
      ? [path]
      : []
  })

describe("form context hook dependencies", () => {
  it("flags the form context object in a dependency array", () => {
    const sample = [
      "const Field = () => {",
      "  const form = useFormContext()",
      "  useEffect(() => { form.setValue('a', 1) }, [form])",
      "  useEffect(() => { form.setValue('b', 1) }, [form.setValue])",
      "}",
    ].join("\n")

    expect(findUnstableFormDependencies("sample.tsx", sample)).toEqual([
      "sample.tsx:3 form",
    ])
  })

  it("no hook in the package depends on the form context object", () => {
    const findings = sourceFiles(SRC_DIR).flatMap((file) =>
      findUnstableFormDependencies(
        relative(SRC_DIR, file),
        readFileSync(file, "utf8")
      )
    )

    expect(findings).toEqual([])
  })
})
