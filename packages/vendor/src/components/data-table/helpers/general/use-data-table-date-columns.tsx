import {
  createDataTableColumnHelper,
  Tooltip,
  useDataTable,
} from "@medusajs/ui"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useDate } from "../../../../hooks/use-date"

type EntityWithDates = {
  created_at: string
  updated_at: string
}

export const useDataTableDateColumns = <
  TData extends EntityWithDates,
>(): Parameters<typeof useDataTable<TData>>[0]["columns"] => {
  const { t } = useTranslation()
  const { getFullDate } = useDate()

  return useMemo(() => {
    const columnHelper = createDataTableColumnHelper<TData>()

    return [
      columnHelper.accessor((row) => row.created_at, {
        id: "created_at",
        header: t("fields.createdAt"),
        cell: ({ row }) => {
          return (
            <Tooltip
              content={getFullDate({
                date: row.original.created_at,
                includeTime: true,
              })}
            >
              <span>{getFullDate({ date: row.original.created_at })}</span>
            </Tooltip>
          )
        },
        enableSorting: true,
        sortAscLabel: t("filters.sorting.dateAsc"),
        sortDescLabel: t("filters.sorting.dateDesc"),
      }),
      columnHelper.accessor((row) => row.updated_at, {
        id: "updated_at",
        header: t("fields.updatedAt"),
        cell: ({ row }) => {
          return (
            <Tooltip
              content={getFullDate({
                date: row.original.updated_at,
                includeTime: true,
              })}
            >
              <span>{getFullDate({ date: row.original.updated_at })}</span>
            </Tooltip>
          )
        },
        enableSorting: true,
        sortAscLabel: t("filters.sorting.dateAsc"),
        sortDescLabel: t("filters.sorting.dateDesc"),
      }),
    ]
  }, [t, getFullDate])
}
