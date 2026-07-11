import { Command } from "../../../hooks/use-command-history"
import { DataGridCellValue } from "../types"

export type DataGridBulkUpdateCommandArgs = {
  fields: string[]
  next: DataGridCellValue[]
  prev: DataGridCellValue[]
  setter: (
    fields: string[],
    values: DataGridCellValue[],
    isHistory?: boolean
  ) => void
}

export class DataGridBulkUpdateCommand implements Command {
  private _fields: string[]

  private _prev: DataGridCellValue[]
  private _next: DataGridCellValue[]

  private _setter: (
    fields: string[],
    values: DataGridCellValue[],
    isHistory?: boolean
  ) => void

  constructor({ fields, prev, next, setter }: DataGridBulkUpdateCommandArgs) {
    this._fields = fields
    this._prev = prev
    this._next = next
    this._setter = setter
  }

  execute(redo = false): void {
    this._setter(this._fields, this._next, redo)
  }
  undo(): void {
    this._setter(this._fields, this._prev, true)
  }
  redo(): void {
    this.execute(true)
  }
}
