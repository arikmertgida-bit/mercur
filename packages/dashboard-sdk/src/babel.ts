import { parse } from "@babel/parser"
import _traverse from "@babel/traverse"
import {
    isBooleanLiteral,
    isCallExpression,
    isFunctionDeclaration,
    isIdentifier,
    isMemberExpression,
    isNumericLiteral,
    isObjectExpression,
    isObjectProperty,
    isStringLiteral,
    isUnaryExpression,
    isVariableDeclaration,
    isVariableDeclarator,
    isArrayExpression,
    type ObjectMethod,
    type ObjectProperty,
    type SpreadElement,
} from "@babel/types"

let traverse: typeof _traverse
if (typeof _traverse === "function") {
    traverse = _traverse
} else {
    // @babel/traverse's CJS build sometimes wraps the traverse function inside an
    // extra `.default` depending on how the consuming bundler applies ESM/CJS
    // interop; @types/babel__traverse types the default export as the callable
    // itself, so this `.default` access is a genuine runtime/type divergence at
    // this third-party boundary.
    // @ts-expect-error - see comment above: `.default` isn't part of @types/babel__traverse's declared shape
    traverse = _traverse.default
}

/** Root node accepted by `traverse` — aligned with @babel/traverse's declared input. */
export type TraverseRoot = Parameters<typeof traverse>[0]

export type {
    AssignmentExpression,
    ExportNamedDeclaration,
    ExportSpecifier,
    Expression,
    Node,
    ObjectMethod,
    ObjectProperty,
    SpreadElement,
    VariableDeclaration,
    VariableDeclarator,
} from "@babel/types"

export type ObjectExpressionProperty =
    | ObjectProperty
    | ObjectMethod
    | SpreadElement

export {
    parse,
    traverse,
    isBooleanLiteral,
    isCallExpression,
    isFunctionDeclaration,
    isIdentifier,
    isMemberExpression,
    isNumericLiteral,
    isObjectExpression,
    isObjectProperty,
    isStringLiteral,
    isUnaryExpression,
    isVariableDeclaration,
    isVariableDeclarator,
    isArrayExpression,
}
