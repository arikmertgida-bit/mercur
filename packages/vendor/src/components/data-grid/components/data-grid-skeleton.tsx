import { ColumnDef } from "@tanstack/react-table"
import { Skeleton } from "../../common/skeleton"

type DataGridSkeletonProps<TData> = {
  columns: ColumnDef<TData>[]
  rows?: number
}

export const DataGridSkeleton = <TData,>({
  columns,
  rows: rowCount = 10,
}: DataGridSkeletonProps<TData>) => {
  const rows = Array.from({ length: rowCount }, (_, i) => i)

  const colCount = columns.length

  return (
    <div className="bg-ui-bg-subtle size-full">
      <div className="bg-ui-bg-base border-b p-4">
        <div className="bg-ui-button-neutral h-7 w-[116px] animate-pulse rounded-md" />
      </div>
      <div className="bg-ui-bg-subtle size-full overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          }}
        >
          {columns.map((_col, i) => {
            return (
              <div
                // oxlint-disable-next-line react/no-array-index-key -- fixed-length skeleton placeholder, no persistent/reorderable state
                key={i}
                className="bg-ui-bg-base flex h-10 w-[200px] items-center border-b border-r px-4 py-2.5 last:border-r-0"
              >
                <Skeleton className="h-[14px] w-[164px]" />
              </div>
            )
          })}
        </div>
        <div>
          {rows.map((_, j) => (
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
              // oxlint-disable-next-line react/no-array-index-key -- fixed-length skeleton placeholder, no persistent/reorderable state
              key={j}
            >
              {columns.map((_col, k) => {
                return (
                  <div
                    // oxlint-disable-next-line react/no-array-index-key -- fixed-length skeleton placeholder, no persistent/reorderable state
                    key={k}
                    className="bg-ui-bg-base flex h-10 w-[200px] items-center border-b border-r px-4 py-2.5 last:border-r-0"
                  >
                    <Skeleton className="h-[14px] w-[164px]" />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
