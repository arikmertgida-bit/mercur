import { useCallback } from "react"
import { DataGridMatrix } from "../models"
import { CellErrorMetadata, CellMetadata, DataGridCoordinates } from "../types"
import { generateCellId } from "../utils"

type UseDataGridCellMetadataOptions<TData> = {
  matrix: DataGridMatrix<TData>
}

export const useDataGridCellMetadata = <TData,>({
  matrix,
}: UseDataGridCellMetadataOptions<TData>) => {
  /**
   * Creates metadata for a cell.
   */
  const getCellMetadata = useCallback(
    (coords: DataGridCoordinates): CellMetadata => {
      const { row, col } = coords

      const id = generateCellId(coords)
      const field = matrix.getCellField(coords)
      const type = matrix.getCellType(coords)

      if (!field || !type) {
        throw new Error(`'field' or 'type' is null for cell ${id}`)
      }

      const inputAttributes = {
        "data-row": row,
        "data-col": col,
        "data-cell-id": id,
        "data-field": field,
      }

      const innerAttributes = {
        "data-container-id": id,
      }

      return {
        id,
        field,
        type,
        inputAttributes,
        innerAttributes,
      }
    },
    [matrix]
  )

  /**
   * Creates error metadata for a cell. This is used to display error messages
   * in the cell, and its containing row.
   */
  const getCellErrorMetadata = useCallback(
    (coords: DataGridCoordinates): CellErrorMetadata => {
      const accessor = matrix.getRowAccessor(coords.row)
      const field = matrix.getCellField(coords)

      return {
        accessor,
        field,
      }
    },
    [matrix]
  )

  return {
    getCellMetadata,
    getCellErrorMetadata,
  }
}
