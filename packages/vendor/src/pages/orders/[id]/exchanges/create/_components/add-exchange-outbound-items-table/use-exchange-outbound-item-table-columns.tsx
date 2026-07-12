import { Checkbox, Text } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Thumbnail } from "@components/common/thumbnail"
import { PlaceholderCell } from "@components/table/table-cells/common/placeholder-cell"

// One row per product variant, flattened from `sdk.vendor.products.query`
// (already seller-scoped at the API boundary).
export type OutboundVariantPickerRow = {
  id: string
  sku?: string | null
  title?: string | null
  product?: {
    id?: string | null
    title?: string | null
    thumbnail?: string | null
  } | null
}

const columnHelper = createColumnHelper<OutboundVariantPickerRow>()

export const useExchangeOutboundItemTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => {
          const isSelectable = row.getCanSelect()

          return (
            <Checkbox
              disabled={!isSelectable}
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
        },
      }),
      columnHelper.display({
        id: "product",
        header: t("fields.product"),
        cell: ({ row }) => {
          const productTitle = row.original.product?.title
          if (!productTitle) {
            return <PlaceholderCell />
          }
          return (
            <div className="flex h-full w-full max-w-[300px] items-center gap-x-3 overflow-hidden">
              <Thumbnail src={row.original.product?.thumbnail} />
              <Text
                size="small"
                leading="compact"
                className="truncate"
                title={productTitle}
              >
                {productTitle}
              </Text>
            </div>
          )
        },
      }),
      columnHelper.accessor("sku", {
        header: t("fields.sku"),
        cell: ({ getValue }) => {
          const sku = getValue()
          if (!sku) return <PlaceholderCell />
          return (
            <Text size="small" leading="compact" className="truncate">
              {sku}
            </Text>
          )
        },
      }),
      columnHelper.accessor("title", {
        id: "variant_title",
        header: t("fields.title"),
        cell: ({ getValue }) => {
          const title = getValue()
          if (!title) return <PlaceholderCell />
          return (
            <Text size="small" leading="compact" className="truncate">
              {title}
            </Text>
          )
        },
      }),
    ],
    [t]
  )
}
