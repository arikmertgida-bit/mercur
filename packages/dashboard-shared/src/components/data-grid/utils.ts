import type { JsonValue } from "@mercurjs/types"
import type { CellContext } from "@tanstack/react-table"

import { DataGridCoordinates, DataGridFormValues } from "./types"

export function generateCellId(coords: DataGridCoordinates) {
  return `${coords.row}:${coords.col}`
}

/**
 * Check if a cell is equal to a set of coords
 * @param cell - The cell to compare
 * @param coords - The coords to compare
 * @returns Whether the cell is equal to the coords
 */
export function isCellMatch(
  cell: DataGridCoordinates,
  coords?: DataGridCoordinates | null
) {
  if (!coords) {
    return false
  }

  return cell.row === coords.row && cell.col === coords.col
}

const SPECIAL_FOCUS_KEYS = [".", ","]

export function isSpecialFocusKey(event: KeyboardEvent) {
  return SPECIAL_FOCUS_KEYS.includes(event.key) && event.ctrlKey && event.altKey
}
type JsonContainer = JsonValue[] | { [key: string]: JsonValue }

const isJsonContainer = (
  value: JsonValue | undefined
): value is JsonContainer => typeof value === "object" && value !== null

const readChild = (
  container: JsonContainer,
  key: string
): JsonValue | undefined =>
  Array.isArray(container) ? container[Number(key)] : container[key]

const writeChild = (
  container: JsonContainer,
  key: string,
  value: JsonValue
): void => {
  if (Array.isArray(container)) {
    container[Number(key)] = value
    return
  }

  container[key] = value
}

/**
 * Reads the value at a dot-separated form path (e.g. `variants.0.price`).
 */
export function getValueAtPath(
  values: DataGridFormValues,
  path: string
): JsonValue | undefined {
  let current: JsonValue | undefined = values

  for (const key of path.split(".")) {
    if (!isJsonContainer(current)) {
      return undefined
    }

    current = readChild(current, key)
  }

  return current
}

/**
 * Writes `value` at a dot-separated form path in place, creating empty
 * objects for missing intermediate segments.
 */
export function setValueAtPath(
  values: DataGridFormValues,
  path: string,
  value: JsonValue
): void {
  const keys = path.split(".")
  const last = keys.pop()

  if (last === undefined) {
    return
  }

  let current: JsonContainer = values

  for (const key of keys) {
    const next = readChild(current, key)

    if (isJsonContainer(next)) {
      current = next
      continue
    }

    const created: JsonContainer = {}
    writeChild(current, key, created)
    current = created
  }

  writeChild(current, last, value)
}

export { toInputValue } from "../../lib/json"

/**
 * The grid renders every cell with its position appended to TanStack's
 * cell context (see `DataGridCell` in data-grid-root).
 */
export function getCellCoordinates<TData, TValue>(
  context: CellContext<TData, TValue>
): DataGridCoordinates {
  if (
    "rowIndex" in context &&
    "columnIndex" in context &&
    typeof context.rowIndex === "number" &&
    typeof context.columnIndex === "number"
  ) {
    return { row: context.rowIndex, col: context.columnIndex }
  }

  throw new Error("DataGrid cells must be rendered by DataGridRoot")
}
