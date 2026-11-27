import type { JsonValue } from "@mercurjs/types"
import { PropsWithChildren } from "react"

import { clx } from "@medusajs/ui"
import { useDataGridCellError } from "../hooks"
import { DataGridCellProps } from "../types"
import { DataGridRowErrorIndicator } from "./data-grid-row-error-indicator"

type DataGridReadonlyCellProps<TData, TValue = JsonValue> = PropsWithChildren<
  DataGridCellProps<TData, TValue>
> & {
  color?: "muted" | "normal"
  isMultiLine?: boolean
}

export const DataGridReadonlyCell = <TData, TValue = JsonValue>({
  context,
  color = "muted",
  children,
  isMultiLine = false,
}: DataGridReadonlyCellProps<TData, TValue>) => {
  const { rowErrors } = useDataGridCellError({ context })

  return (
    <div
      className={clx(
        "txt-compact-small text-ui-fg-subtle flex w-full cursor-not-allowed justify-between overflow-hidden px-4 py-2.5 outline-none",
        color === "muted" && "bg-ui-bg-subtle",
        color === "normal" && "bg-ui-bg-base",
        "h-full items-center"
      )}
    >
      {/* Catalog text (often Latin in an RTL panel) is cut at its own end; short text still aligns with the column. */}
      <div
        dir="auto"
        className={clx("flex-1 [text-align:match-parent]", {
          truncate: !isMultiLine,
          "whitespace-pre-wrap break-words": isMultiLine,
        })}
      >
        {children}
      </div>
      <DataGridRowErrorIndicator rowErrors={rowErrors} />
    </div>
  )
}
