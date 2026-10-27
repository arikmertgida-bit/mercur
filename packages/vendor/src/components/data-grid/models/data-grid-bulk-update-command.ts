import type { JsonValue } from "@mercurjs/types"

import { Command } from "../../../hooks/use-command-history"

export type DataGridBulkUpdateCommandArgs = {
  fields: string[]
  next: JsonValue[]
  prev: JsonValue[]
  setter: (fields: string[], values: JsonValue[], isHistory?: boolean) => void
}

export class DataGridBulkUpdateCommand implements Command {
  private _fields: string[]

  private _prev: JsonValue[]
  private _next: JsonValue[]

  private _setter: (
    fields: string[],
    values: JsonValue[],
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
