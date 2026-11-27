import { Column, Row, VisibilityState } from "@tanstack/react-table"
import { ScrollToOptions, Virtualizer } from "@tanstack/react-virtual"
import { Dispatch, SetStateAction, useCallback } from "react"
import { DataGridMatrix, DataGridQueryTool } from "../models"
import { DataGridCoordinates } from "../types"
import { getVisibleIndex } from "../utils"

type UseDataGridNavigationOptions<TData> = {
  matrix: DataGridMatrix<TData>
  anchor: DataGridCoordinates | null
  flatRows: Row<TData>[]
  visibleRows: Row<TData>[]
  visibleColumns: Column<TData>[]
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  columnVirtualizer: Virtualizer<HTMLDivElement, Element>
  setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>
  flatColumns: Column<TData>[]
  queryTool: DataGridQueryTool | null
  setSingleRange: (coords: DataGridCoordinates | null) => void
}

/** One item past the target in the direction of travel, so the next move is already in view. */
const getLookAheadIndex = (
  index: number,
  forward: boolean,
  count: number
): number => {
  const next = forward ? index + 1 : index - 1

  return next >= 0 && next < count ? next : index
}

export const useDataGridNavigation = <TData,>({
  matrix,
  anchor,
  flatRows,
  visibleColumns,
  visibleRows,
  columnVirtualizer,
  rowVirtualizer,
  setColumnVisibility,
  flatColumns,
  queryTool,
  setSingleRange,
}: UseDataGridNavigationOptions<TData>) => {
  const scrollToCoordinates = useCallback(
    (coords: DataGridCoordinates, direction: "horizontal" | "vertical" | "both") => {
      if (!anchor) {
        return
      }

      // The virtualizers count visible rows and columns only.
      const row = getVisibleIndex(flatRows, visibleRows, coords.row)
      const col = getVisibleIndex(flatColumns, visibleColumns, coords.col)

      const scrollOptions: ScrollToOptions = { align: "auto", behavior: "auto" }

      if ((direction === "horizontal" || direction === "both") && col !== -1) {
        columnVirtualizer.scrollToIndex(
          getLookAheadIndex(col, coords.col >= anchor.col, visibleColumns.length),
          scrollOptions
        )
      }

      if ((direction === "vertical" || direction === "both") && row !== -1) {
        rowVirtualizer.scrollToIndex(
          getLookAheadIndex(row, coords.row >= anchor.row, visibleRows.length),
          scrollOptions
        )
      }
    },
    [
      anchor,
      columnVirtualizer,
      flatRows,
      flatColumns,
      visibleRows,
      rowVirtualizer,
      visibleColumns,
    ]
  )

  const navigateToField = useCallback(
    (field: string) => {
      const coords = matrix.getCoordinatesByField(field)

      if (!coords) {
        return
      }

      const column = flatColumns[coords.col]

      // Ensure that the column is visible
      setColumnVisibility((prev) => {
        return {
          ...prev,
          [column.id]: true,
        }
      })

      requestAnimationFrame(() => {
        scrollToCoordinates(coords, "both")
        setSingleRange(coords)
      })

      requestAnimationFrame(() => {
        const input = queryTool?.getInput(coords)

        if (input) {
          input.focus()
        }
      })
    },
    [
      matrix,
      flatColumns,
      setColumnVisibility,
      scrollToCoordinates,
      setSingleRange,
      queryTool,
    ]
  )

  return {
    scrollToCoordinates,
    navigateToField,
  }
}
