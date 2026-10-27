import { DataGridCoordinates } from "../types"
import { generateCellId } from "../utils"

export class DataGridQueryTool {
  private container: HTMLElement | null

  constructor(container: HTMLElement | null) {
    this.container = container
  }

  getInput(cell: DataGridCoordinates) {
    const id = this._getCellId(cell)

    const input = this.container?.querySelector(`[data-cell-id="${id}"]`)

    return input instanceof HTMLElement ? input : null
  }

  getInputByField(field: string) {
    const input = this.container?.querySelector(`[data-field="${field}"]`)

    return input instanceof HTMLElement ? input : null
  }

  getCoordinatesByField(field: string): DataGridCoordinates | null {
    const cell = this.container?.querySelector(
      `[data-field="${field}"][data-cell-id]`
    )

    if (!cell) {
      return null
    }

    const cellId = cell.getAttribute("data-cell-id")

    if (!cellId) {
      return null
    }

    const [row, col] = cellId.split(":").map((n) => parseInt(n, 10))

    if (isNaN(row) || isNaN(col)) {
      return null
    }

    return { row, col }
  }

  getContainer(cell: DataGridCoordinates) {
    const id = this._getCellId(cell)

    const container = this.container?.querySelector(
      `[data-container-id="${id}"]`
    )

    return container instanceof HTMLElement ? container : null
  }

  private _getCellId(cell: DataGridCoordinates): string {
    return generateCellId(cell)
  }
}