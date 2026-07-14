import { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "@components/table/data-table"
import { useProducts } from "@hooks/api/products"
import { useDataTable } from "@hooks/use-data-table"

import {
  OutboundVariantPickerRow,
  useExchangeOutboundItemTableColumns,
} from "./use-exchange-outbound-item-table-columns"
import { useExchangeOutboundItemTableFilters } from "./use-exchange-outbound-item-table-filters"
import { useExchangeOutboundItemTableQuery } from "./use-exchange-outbound-item-table-query"

const PAGE_SIZE = 50
const PREFIX = "rit"

// Field set covers the picker columns + the variant id needed downstream.
// `sdk.vendor.products.query` is seller-scoped at the API boundary, so the
// "from this store's own catalog" rule is implicit.
const PRODUCT_PICKER_FIELDS = [
  "id",
  "title",
  "thumbnail",
  "variants.id",
  "variants.sku",
  "variants.title",
].join(",")

type ProductPickerRow = {
  id?: string | null
  title?: string | null
  thumbnail?: string | null
  variants?: OutboundVariantPickerRow[] | null
}

type AddExchangeOutboundItemsTableProps = {
  /**
   * Receives the picked variant ids. The parent submits them as
   * `{ variant_id, quantity }` to the exchange "add outbound items"
   * route, which computes the unit price server-side when none is
   * supplied.
   */
  onSelectionChange: (variantIds: string[]) => void
  selectedItems?: string[]
}

const EMPTY_SELECTED_ITEMS: string[] = []

export const AddExchangeOutboundItemsTable = ({
  onSelectionChange,
  selectedItems = EMPTY_SELECTED_ITEMS,
}: AddExchangeOutboundItemsTableProps) => {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    selectedItems.reduce<RowSelectionState>((acc, id) => {
      acc[id] = true
      return acc
    }, {})
  )

  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const newState: RowSelectionState =
      typeof fn === "function" ? fn(rowSelection) : fn

    setRowSelection(newState)
    onSelectionChange(Object.keys(newState))
  }

  const { searchParams, raw } = useExchangeOutboundItemTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })

  const productsResponse = useProducts({
    ...searchParams,
    fields: PRODUCT_PICKER_FIELDS,
  })
  const rawProducts = productsResponse.products as
    | ProductPickerRow[]
    | undefined
  const rawCount = productsResponse.count ?? 0

  const variants = useMemo<OutboundVariantPickerRow[]>(() => {
    const products = rawProducts ?? []
    return products.flatMap((product) =>
      (product.variants ?? []).map((variant) => ({
        ...variant,
        product: {
          id: product.id,
          title: product.title,
          thumbnail: product.thumbnail,
        },
      }))
    )
  }, [rawProducts])

  const count = variants.length
  void rawCount

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
