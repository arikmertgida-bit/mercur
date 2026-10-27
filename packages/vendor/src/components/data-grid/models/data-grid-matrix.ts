import { ColumnDef, Row } from "@tanstack/react-table"
import {
  createDataGridColumnMetaSchema,
  DataGridColumnType,
  DataGridCoordinates,
  Grid,
  GridCell,
} from "../types"

export class DataGridMatrix<TData> {
  private multiColumnSelection: boolean
  private cells: Grid
  public rowAccessors: (string | null)[] = []
  public columnAccessors: (string | null)[] = []

  constructor(
    data: Row<TData>[],
    columns: ColumnDef<TData>[],
    multiColumnSelection: boolean = false
  ) {
    this.multiColumnSelection = multiColumnSelection
    this.cells = this._populateCells(data, columns)

    this.rowAccessors = this._computeRowAccessors()
    this.columnAccessors = this._computeColumnAccessors()
  }

  private _computeRowAccessors(): (string | null)[] {
    return this.cells.map((_, rowIndex) => this.getRowAccessor(rowIndex))
  }

  private _computeColumnAccessors(): (string | null)[] {
    if (this.cells.length === 0) {
      return []
    }

    return this.cells[0].map((_, colIndex) => this.getColumnAccessor(colIndex))
  }

  getFirstNavigableCell(): DataGridCoordinates | null {
    for (let row = 0; row < this.cells.length; row++) {
      for (let col = 0; col < this.cells[0].length; col++) {
        if (this.cells[row][col] !== null) {
          return { row, col }
        }
      }
    }

    return null
  }

  getFieldsInRow(row: number): string[] {
    const keys: string[] = []

    if (row < 0 || row >= this.cells.length) {
      return keys
    }

    this.cells[row].forEach((cell) => {
      if (cell !== null) {
        keys.push(cell.field)
      }
    })

    return keys
  }

  getFieldsInSelection(
    start: DataGridCoordinates | null,
    end: DataGridCoordinates | null
  ): string[] {
    const keys: string[] = []

    if (!start || !end) {
      return keys
    }

    if (!this.multiColumnSelection && start.col !== end.col) {
      throw new Error(
        "Selection must be in the same column when multiColumnSelection is disabled"
      )
    }

    const startRow = Math.min(start.row, end.row)
    const endRow = Math.max(start.row, end.row)
    const startCol = this.multiColumnSelection
      ? Math.min(start.col, end.col)
      : start.col
    const endCol = this.multiColumnSelection
      ? Math.max(start.col, end.col)
      : start.col

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = this._isValidPosition(row, col)
          ? this.cells[row][col]
          : null

        if (cell) {
          keys.push(cell.field)
        }
      }
    }

    return keys
  }

  getCellField(cell: DataGridCoordinates): string | null {
    if (this._isValidPosition(cell.row, cell.col)) {
      return this.cells[cell.row][cell.col]?.field || null
    }

    return null
  }

  getCellType(cell: DataGridCoordinates): DataGridColumnType | null {
    if (this._isValidPosition(cell.row, cell.col)) {
      return this.cells[cell.row][cell.col]?.type || null
    }

    return null
  }

  getIsCellSelected(
    cell: DataGridCoordinates | null,
    start: DataGridCoordinates | null,
    end: DataGridCoordinates | null
  ): boolean {
    if (!cell || !start || !end) {
      return false
    }

    if (!this.multiColumnSelection && start.col !== end.col) {
      throw new Error(
        "Selection must be in the same column when multiColumnSelection is disabled"
      )
    }

    const startRow = Math.min(start.row, end.row)
    const endRow = Math.max(start.row, end.row)
    const startCol = this.multiColumnSelection
      ? Math.min(start.col, end.col)
      : start.col
    const endCol = this.multiColumnSelection
      ? Math.max(start.col, end.col)
      : start.col

    return (
      cell.row >= startRow &&
      cell.row <= endRow &&
      cell.col >= startCol &&
      cell.col <= endCol
    )
  }

  toggleColumn(col: number, enabled: boolean) {
    if (col < 0 || col >= this.cells[0].length) {
      return
    }

    this.cells.forEach((row, index) => {
      const cell = row[col]

      if (cell) {
        this.cells[index][col] = {
          ...cell,
          enabled,
        }
      }
    })
  }

  toggleRow(row: number, enabled: boolean) {
    if (row < 0 || row >= this.cells.length) {
      return
    }

    this.cells[row].forEach((cell, index) => {
      if (cell) {
        this.cells[row][index] = {
          ...cell,
          enabled,
        }
      }
    })
  }

  getCoordinatesByField(field: string): DataGridCoordinates | null {
    if (this.rowAccessors.length === 1) {
      const col = this.columnAccessors.indexOf(field)

      if (col === -1) {
        return null
      }

      return { row: 0, col }
    }

    for (let row = 0; row < this.rowAccessors.length; row++) {
      const rowAccessor = this.rowAccessors[row]

      if (rowAccessor === null) {
        continue
      }

      if (!field.startsWith(rowAccessor)) {
        continue
      }

      for (let column = 0; column < this.columnAccessors.length; column++) {
        const columnAccessor = this.columnAccessors[column]

        if (columnAccessor === null) {
          continue
        }

        const fullFieldPath = `${rowAccessor}.${columnAccessor}`

        if (fullFieldPath === field) {
          return { row, col: column }
        }
      }
    }

    return null
  }

  getRowAccessor(row: number): string | null {
    if (row < 0 || row >= this.cells.length) {
      return null
    }

    const cells = this.cells[row]

    const nonNullFields = cells
      .filter((cell): cell is GridCell => cell !== null)
      .map((cell) => cell.field.split("."))

    if (nonNullFields.length === 0) {
      return null
    }

    let commonParts = nonNullFields[0]

    for (const segments of nonNullFields) {
      commonParts = commonParts.filter(
        (part, index) => segments[index] === part
      )

      if (commonParts.length === 0) {
        break
      }
    }

    const accessor = commonParts.join(".")

    if (!accessor) {
      return null
    }

    return accessor
  }

  public getColumnAccessor(column: number): string | null {
    if (column < 0 || column >= this.cells[0].length) {
      return null
    }

    // Extract the unique part of the field name for each row in the specified column
    const uniqueParts = this.cells
      .map((row, rowIndex) => {
        const cell = row[column]
        if (!cell) {
          return null
        }

        // Get the row accessor for the current row
        const rowAccessor = this.getRowAccessor(rowIndex)

        // Remove the row accessor part from the field name
        if (rowAccessor && cell.field.startsWith(rowAccessor + ".")) {
          return cell.field.slice(rowAccessor.length + 1) // Extract the part after the row accessor
        }

        return null
      })
      .filter((part) => part !== null) // Filter out null values

    if (uniqueParts.length === 0) {
      return null
    }

    // Ensure all unique parts are the same (this should be true for well-formed data)
    const firstPart = uniqueParts[0]
    const isConsistent = uniqueParts.every((part) => part === firstPart)

    return isConsistent ? firstPart : null
  }

  getValidMovement(
    row: number,
    col: number,
    direction: string,
    metaKey: boolean = false
  ): DataGridCoordinates {
    const [dRow, dCol] = this._getDirectionDeltas(direction)

    if (metaKey) {
      return this._getLastValidCellInDirection(row, col, dRow, dCol)
    } else {
      let newRow = row + dRow
      let newCol = col + dCol

      while (this._isValidPosition(newRow, newCol)) {
        if (
          this.cells[newRow][newCol] !== null &&
          this.cells[newRow][newCol]?.enabled !== false
        ) {
          return { row: newRow, col: newCol }
        }
        newRow += dRow
        newCol += dCol
      }

      return { row, col }
    }
  }

  private _isValidPosition(
    row: number,
    col: number,
    cells?: Grid
  ): boolean {
    if (!cells) {
      cells = this.cells
    }

    return row >= 0 && row < cells.length && col >= 0 && col < cells[0].length
  }

  private _getDirectionDeltas(direction: string): [number, number] {
    switch (direction) {
      case "ArrowUp":
        return [-1, 0]
      case "ArrowDown":
        return [1, 0]
      case "ArrowLeft":
        return [0, -1]
      case "ArrowRight":
        return [0, 1]
      default:
        return [0, 0]
    }
  }

  private _getLastValidCellInDirection(
    row: number,
    col: number,
    dRow: number,
    dCol: number
  ): DataGridCoordinates {
    let newRow = row
    let newCol = col
    let lastValidRow = row
    let lastValidCol = col

    while (this._isValidPosition(newRow + dRow, newCol + dCol)) {
      newRow += dRow
      newCol += dCol
      if (this.cells[newRow][newCol] !== null) {
        lastValidRow = newRow
        lastValidCol = newCol
      }
    }

    return {
      row: lastValidRow,
      col: lastValidCol,
    }
  }

  private _populateCells(rows: Row<TData>[], columns: ColumnDef<TData>[]) {
    const cells: Grid = Array.from({ length: rows.length }, () =>
      Array.from({ length: columns.length }, () => null)
    )
    const metaSchema = createDataGridColumnMetaSchema<TData>()

    rows.forEach((row, rowIndex) => {
      columns.forEach((column, colIndex) => {
        if (!this._isValidPosition(rowIndex, colIndex, cells)) {
          return
        }

        const meta = metaSchema.safeParse(column.meta ?? {})

        if (!meta.success) {
          return
        }

        const { field, type } = meta.data

        const fieldValue = field ? field({ row, column }) : null

        if (typeof fieldValue !== "string" || !fieldValue || !type) {
          return
        }

        cells[rowIndex][colIndex] = {
          field: fieldValue,
          type,
          enabled: true,
        }
      })
    })

    return cells
  }
}
