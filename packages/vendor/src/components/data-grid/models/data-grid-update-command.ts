import { Command } from "../../../hooks/use-command-history"
import { DataGridCellValue } from "../types"

export type DataGridUpdateCommandArgs = {
  prev: DataGridCellValue
  next: DataGridCellValue
  setter: (value: DataGridCellValue) => void
}

export class DataGridUpdateCommand implements Command {
  private _prev: DataGridCellValue
  private _next: DataGridCellValue

  private _setter: (value: DataGridCellValue) => void

  constructor({ prev, next, setter }: DataGridUpdateCommandArgs) {
    this._prev = prev
    this._next = next

    this._setter = setter
  }

  execute(): void {
    this._setter(this._next)
  }

  undo(): void {
    this._setter(this._prev)
  }

  redo(): void {
    this.execute()
  }
}