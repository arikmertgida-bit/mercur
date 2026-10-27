import type { JsonValue } from "@mercurjs/types"
import { ReactNode } from "react"
import { useDataGridDuplicateCell } from "../hooks"

interface DataGridDuplicateCellProps {
  duplicateOf: string
  children?: ReactNode | ((props: { value: JsonValue }) => ReactNode)
}
export const DataGridDuplicateCell = ({
  duplicateOf,
  children,
}: DataGridDuplicateCellProps) => {
  const { watchedValue } = useDataGridDuplicateCell({ duplicateOf })

  return (
    <div className="bg-ui-bg-base txt-compact-small text-ui-fg-subtle flex size-full cursor-not-allowed items-center justify-between overflow-hidden px-4 py-2.5 outline-none">
      {typeof children === "function"
        ? children({ value: watchedValue })
        : children}
    </div>
  )
}
