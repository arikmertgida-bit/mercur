import { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "@components/table/data-table"
import { useProducts } from "@hooks/api/products"
import { useDataTable } from "@hooks/use-data-table"

import {
  ClaimOutboundVariantPickerRow,
  useClaimOutboundItemTableColumns,
} from "./use-claim-outbound-item-table-columns"
import { useClaimOutboundItemTableFilters } from "./use-claim-outbound-item-table-filters"
import { useClaimOutboundItemTableQuery } from "./use-claim-outbound-item-table-query"

const PAGE_SIZE = 50
const PREFIX = "rit"

// Field set covers the picker columns + the variant id needed downstream
// when items are submitted to `useAddClaimOutboundItems`.
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
  variants?: ClaimOutboundVariantPickerRow[] | null
}

type AddClaimOutboundItemsTableProps = {
  /**
   * Receives the picked variant ids AND a lookup map of the selected
   * variant rows (id → row). The form layer forwards the ids to
   * `useAddClaimOutboundItems` as `{ variant_id, quantity }`; the lookup
   * is used to enrich the staged outbound row with title / sku /
   * thumbnail so the list doesn't render the raw `variant_…` id as a
   * "title".
   */
  onSelectionChange: (
    variantIds: string[],
    variants: Record<string, ClaimOutboundVariantPickerRow>
  ) => void
}

export const AddClaimOutboundItemsTable = ({
  onSelectionChange,
}: AddClaimOutboundItemsTableProps) => {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  // Lookup of every variant the picker has seen this session so the
  // section can still resolve titles for variants selected on a previous
  // page after the user paginates away.
  const [variantLookup, setVariantLookup] = useState<
    Record<string, ClaimOutboundVariantPickerRow>
  >({})

  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const newState: RowSelectionState =
      typeof fn === "function" ? fn(rowSelection) : fn

    setRowSelection(newState)
    onSelectionChange(Object.keys(newState), variantLookup)
  }

  const { searchParams, raw } = useClaimOutboundItemTableQuery({
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

  const variants = useMemo<ClaimOutboundVariantPickerRow[]>(() => {
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

  useMemo(() => {
    if (!variants.length) return
    setVariantLookup((prev) => {
      let changed = false
      const next = { ...prev }
      for (const variant of variants) {
        if (!next[variant.id]) {
          next[variant.id] = variant
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [variants])

  const count = variants.length

  const columns = useClaimOutboundItemTableColumns()
  const filters = useClaimOutboundItemTableFilters()

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
      data-testid="add-claim-outbound-picker"
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
