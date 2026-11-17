import { Table, VisibilityState } from "@tanstack/react-table"
import { useCallback, useMemo, useState } from "react"
import { FieldError, FieldErrors, FieldValues } from "react-hook-form"

import { DataGridMatrix } from "../models"
import { VisibilitySnapshot } from "../types"

export const useDataGridErrorHighlighting = <
  TData,
  TFieldValues extends FieldValues
>(
  matrix: DataGridMatrix<TData>,
  grid: Table<TData>,
  errors: FieldErrors<TFieldValues>
) => {
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false)
  const [visibilitySnapshot, setVisibilitySnapshot] =
    useState<VisibilitySnapshot | null>(null)

  const { flatRows } = grid.getRowModel()
  const flatColumns = grid.getAllFlatColumns()

  const errorPaths = findErrorPaths(errors)
  const errorCount = errorPaths.length

  const { rowsWithErrors, columnsWithErrors } = useMemo(() => {
    const rowsWithErrors = new Set<number>()
    const columnsWithErrors = new Set<number>()

    errorPaths.forEach((errorPath) => {
      const rowIndex = matrix.rowAccessors.findIndex(
        (accessor) =>
          accessor &&
          (errorPath === accessor || errorPath.startsWith(`${accessor}.`))
      )
      if (rowIndex !== -1) {
        rowsWithErrors.add(rowIndex)
      }

      const rowAccessor = rowIndex !== -1 ? matrix.rowAccessors[rowIndex] : null
      const relativePath =
        rowAccessor && errorPath.startsWith(`${rowAccessor}.`)
          ? errorPath.slice(rowAccessor.length + 1)
          : errorPath

      // An error on a parent path (e.g. `variants.0.prices`) belongs to
      // every column under it, one per currency.
      matrix.columnAccessors.forEach((accessor, columnIndex) => {
        if (
          accessor &&
          (errorPath === accessor ||
            errorPath.endsWith(`.${accessor}`) ||
            accessor.startsWith(`${relativePath}.`))
        ) {
          columnsWithErrors.add(columnIndex)
        }
      })

      // A field shared by every row (no row accessor of its own) still
      // needs one visible row for its cell to show up while highlighting.
      if (rowIndex === -1 && matrix.columnAccessors.includes(errorPath)) {
        rowsWithErrors.add(0)
      }
    })

    return { rowsWithErrors, columnsWithErrors }
  }, [errorPaths, matrix.rowAccessors, matrix.columnAccessors])

  const toggleErrorHighlighting = useCallback(
    (
      currentRowVisibility: VisibilityState,
      currentColumnVisibility: VisibilityState,
      setRowVisibility: (visibility: VisibilityState) => void,
      setColumnVisibility: (visibility: VisibilityState) => void
    ) => {
      if (isHighlighted) {
        // Clear error highlights
        if (visibilitySnapshot) {
          setRowVisibility(visibilitySnapshot.rows)
          setColumnVisibility(visibilitySnapshot.columns)
        }
      } else {
        // Highlight errors
        setVisibilitySnapshot({
          rows: { ...currentRowVisibility },
          columns: { ...currentColumnVisibility },
        })

        const rowsToHide = flatRows
          .map((_, index) => {
            return !rowsWithErrors.has(index) ? index : undefined
          })
          .filter((index): index is number => index !== undefined)

        const columnsToHide = flatColumns
          .map((column, index) => {
            return !columnsWithErrors.has(index) && index !== 0
              ? column.id
              : undefined
          })
          .filter((id): id is string => id !== undefined)

        setRowVisibility(
          rowsToHide.reduce((acc, row) => ({ ...acc, [row]: false }), {})
        )

        setColumnVisibility(
          columnsToHide.reduce(
            (acc, column) => ({ ...acc, [column]: false }),
            {}
          )
        )
      }

      setIsHighlighted((prev) => !prev)
    },
    [
      isHighlighted,
      visibilitySnapshot,
      flatRows,
      flatColumns,
      rowsWithErrors,
      columnsWithErrors,
    ]
  )

  return {
    errorCount,
    isHighlighted,
    toggleErrorHighlighting,
  }
}

function findErrorPaths(
  obj: FieldErrors | FieldError,
  path: string[] = []
): string[] {
  if (typeof obj !== "object" || obj === null) {
    return []
  }

  if ("message" in obj && "type" in obj) {
    return [path.join(".")]
  }

  return Object.entries(obj).flatMap(([key, value]) =>
    findErrorPaths(value, [...path, key])
  )
}
