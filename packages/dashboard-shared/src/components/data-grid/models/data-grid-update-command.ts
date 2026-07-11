import type { JsonValue } from "@mercurjs/types"

import { Command } from "../../../hooks/use-command-history"

export type DataGridUpdateCommandArgs<T extends JsonValue = JsonValue> = {
  prev: T
  next: T
  setter: (value: T) => void
}

export class DataGridUpdateCommand<T extends JsonValue = JsonValue>
  implements Command
{
  private _prev: T
  private _next: T

  private _setter: (value: T) => void

  constructor({ prev, next, setter }: DataGridUpdateCommandArgs<T>) {
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
