import { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "@components/table/data-table"
import { useProducts } from "@hooks/api/products"
import { useDataTable } from "@hooks/use-data-table"

import {
  VariantPickerRow,
  useOrderEditItemsTableColumns,
} from "./use-order-edit-item-table-columns"
import { useOrderEditItemTableFilters } from "./use-order-edit-item-table-filters"
import { useOrderEditItemTableQuery } from "./use-order-edit-item-table-query"

const PAGE_SIZE = 50
const PREFIX = "rit"

// Field set covers the picker columns + the variant id needed downstream
// when items are submitted to the order-edit / exchange / claim "add
// items" routes.
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
  variants?: VariantPickerRow[] | null
}

type AddOrderEditItemsTableProps = {
  /**
   * Receives the picked variant ids. The parent submits them as
   * `{ variant_id, quantity }` to the order-edit "add items" route, which
   * computes the unit price server-side when none is supplied.
   */
  onSelectionChange: (variantIds: string[]) => void
}

export const AddOrderEditItemsTable = ({
  onSelectionChange,
}: AddOrderEditItemsTableProps) => {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const { searchParams, raw } = useOrderEditItemTableQuery({
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

  const variants = useMemo<VariantPickerRow[]>(() => {
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

  const columns = useOrderEditItemsTableColumns()
  const filters = useOrderEditItemTableFilters()

  // Map variant id -> variant so selection state can yield the picked ids.
  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const newState: RowSelectionState =
      typeof fn === "function" ? fn(rowSelection) : fn

    setRowSelection(newState)
    onSelectionChange(Object.keys(newState))
  }

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
