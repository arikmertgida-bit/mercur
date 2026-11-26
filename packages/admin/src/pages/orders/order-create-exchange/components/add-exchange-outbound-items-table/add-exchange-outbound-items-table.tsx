import { SectionNoAccess, useCan } from "@mercurjs/dashboard-shared"
import { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { HttpTypes } from "@medusajs/types"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "@components/table/data-table"
import { useDataTable } from "@hooks/use-data-table"

import { useOrderStoreVariants } from "../../../common/use-order-store-variants"

import { useExchangeOutboundItemTableColumns } from "./use-exchange-outbound-item-table-columns"
import { useExchangeOutboundItemTableFilters } from "./use-exchange-outbound-item-table-filters"
import { useExchangeOutboundItemTableQuery } from "./use-exchange-outbound-item-table-query"

const PAGE_SIZE = 50
const PREFIX = "rit"

type AddExchangeOutboundItemsTableProps = {
  /** The order being changed; only its store's variants are listed. */
  order: HttpTypes.AdminOrder
  /**
   * Receives the picked variant ids. The parent submits them as
   * `{ variant_id, quantity }` to the exchange "add outbound items"
   * route, which computes the unit price server-side when none is
   * supplied.
   */
  onSelectionChange: (variantIds: string[]) => void
  selectedItems?: string[]
}

export const AddExchangeOutboundItemsTable = ({
  order,
  onSelectionChange,
  selectedItems = [],
}: AddExchangeOutboundItemsTableProps) => {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    selectedItems.reduce<RowSelectionState>((acc, id) => {
      acc[id] = true
      return acc
    }, {})
  )

  const { searchParams, raw } = useExchangeOutboundItemTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })

  const canViewProducts = useCan("products")

  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const newState: RowSelectionState =
      typeof fn === "function" ? fn(rowSelection) : fn

    setRowSelection(newState)
    onSelectionChange(Object.keys(newState))
  }

  const { variants, count } = useOrderStoreVariants(
    order,
    searchParams,
    canViewProducts
  )

  const columns = useExchangeOutboundItemTableColumns()
  const filters = useExchangeOutboundItemTableFilters()

  const { table } = useDataTable({
    data: variants,
    columns,
    count,
    enablePagination: true,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
    enableRowSelection: () => true,
    rowSelection: {
      state: rowSelection,
      updater,
    },
  })

  if (!canViewProducts) {
    return <SectionNoAccess />
  }

  return (
    <div
      className="flex size-full flex-col overflow-hidden"
      data-testid="add-variants-picker"
    >
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        filters={filters}
        pagination
        layout="fill"
        search
        orderBy={[
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        prefix={PREFIX}
        queryObject={raw}
      />
    </div>
  )
}
