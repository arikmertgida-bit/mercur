import { JsonValue } from "@mercurjs/types"
import React, { useMemo } from "react"
import { createDataTableColumnHelper, DataTableCellContext } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "react-i18next"
import { getCellRenderer, getColumnValue } from "../../../lib/table/cell-renderers"

export interface ColumnAdapter<TData> {
  getColumnAlignment?: (column: HttpTypes.AdminColumn) => "left" | "center" | "right"
  getCustomAccessor?: (field: string, column: HttpTypes.AdminColumn) => (row: TData) => JsonValue
  transformCellValue?: (value: JsonValue, row: TData, column: HttpTypes.AdminColumn) => React.ReactNode
}

export function useConfigurableTableColumns<TData = any>(
  entity: string,
  apiColumns: HttpTypes.AdminColumn[] | undefined,
  adapter?: ColumnAdapter<TData>
) {
  const columnHelper = createDataTableColumnHelper<TData>()
  const { t } = useTranslation()

  return useMemo(() => {
    if (!apiColumns?.length) {
      return []
    }

    return apiColumns.map(apiColumn => {
      let renderType = apiColumn.computed?.type

      if (!renderType) {
        if (apiColumn.semantic_type === 'timestamp') {
          renderType = 'timestamp'
        } else if (apiColumn.field === 'display_id') {
          renderType = 'display_id'
        } else if (apiColumn.field === 'total') {
          renderType = 'total'
        } else if (apiColumn.semantic_type === 'currency') {
          renderType = 'currency'
        }
      }

      const renderer = getCellRenderer(
        renderType,
        apiColumn.data_type
      )

      const headerAlign = adapter?.getColumnAlignment
        ? adapter.getColumnAlignment(apiColumn)
        : getDefaultColumnAlignment(apiColumn)

      const accessor = (row: TData) => getColumnValue(row, apiColumn)

      // `enableHiding` is a real tanstack `ColumnDef` field, but medusajs/ui's
      // `.accessor()` config type deliberately omits it from its public Pick
      // (column visibility goes through the DataTable's own column-options
      // API instead) — passing it through a named const rather than an
      // inline literal avoids the excess-property check on that one field
      // without suppressing type-checking of the rest of the config.
      const columnConfig = {
        id: apiColumn.field,
        header: () => apiColumn.name,
        cell: ({ getValue, row }: DataTableCellContext<TData, unknown>) => {
          const value = getValue()

          if (adapter?.transformCellValue) {
            const transformed = adapter.transformCellValue(value, row.original, apiColumn)
            if (transformed !== null) {
              return transformed
            }
          }

          return renderer(value, row.original, apiColumn, t)
        },
        meta: {
          name: apiColumn.name,
          column: apiColumn, // Store column metadata for future use
        },
        enableHiding: apiColumn.hideable,
        enableSorting: apiColumn.sortable,
        headerAlign, // Pass the header alignment to the DataTable
      }

      return columnHelper.accessor(accessor, columnConfig)
    })
  }, [
	apiColumns,
	adapter,
	t,
	columnHelper
])
}

function getDefaultColumnAlignment(column: HttpTypes.AdminColumn): "left" | "center" | "right" {
  if (column.semantic_type === "currency" || column.data_type === "currency") {
    return "right"
  }

  if (column.data_type === "number" && column.context !== "identifier") {
    return "right"
  }

  if (
    column.field.includes("total") ||
    column.field.includes("amount") ||
    column.field.includes("price") ||
    column.field.includes("quantity") ||
    column.field.includes("count")
  ) {
    return "right"
  }

  if (column.semantic_type === "status") {
    return "center"
  }

  if (column.computed?.type === "country_code" ||
    column.field === "country" ||
    column.field.includes("country_code")) {
    return "center"
  }

  return "left"
}
