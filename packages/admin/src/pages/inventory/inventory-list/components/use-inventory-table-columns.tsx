import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

import { Checkbox } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PlaceholderCell } from "../../../../components/table/table-cells/common/placeholder-cell"
import { InventoryActions } from "./inventory-actions"

/**
 * The link fields the list query expands (`+variants.product.title,+seller.name`);
 * Medusa's inventory item type doesn't carry them.
 */
const InventoryItemLinksSchema = z.object({
  variants: z
    .array(
      z.object({
        product: z.object({ title: z.string() }).nullish(),
      })
    )
    .nullish(),
  seller: z.object({ name: z.string() }).nullish(),
})

const getInventoryItemLinks = (
  item: HttpTypes.AdminInventoryItem
): z.infer<typeof InventoryItemLinksSchema> => {
  const parsed = InventoryItemLinksSchema.safeParse(item)

  return parsed.success ? parsed.data : {}
}

const columnHelper = createColumnHelper<HttpTypes.AdminInventoryItem>()

export const useInventoryTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => {
          return (
            <Checkbox
              checked={
                table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : table.getIsAllPageRowsSelected()
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              data-testid="inventory-table-header-select-checkbox"
            />
          )
        },
        cell: ({ row }) => {
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              onClick={(e) => {
                e.stopPropagation()
              }}
              data-testid={`inventory-table-cell-${row.id}-select-checkbox`}
            />
          )
        },
      }),
      columnHelper.accessor("title", {
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-title">
            <span data-testid="inventory-table-header-title-text">{t("fields.title")}</span>
          </div>
        ),
        cell: ({ getValue, row }) => {
          const title = getValue()

          if (!title) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span
                className="truncate"
                data-testid={`inventory-table-cell-${row.id}-title-value`}
              >
                {title}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor("sku", {
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-sku">
            <span data-testid="inventory-table-header-sku-text">{t("fields.sku")}</span>
          </div>
        ),
        cell: ({ getValue, row }) => {
          const sku = getValue()

          if (!sku) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span
                className="truncate"
                data-testid={`inventory-table-cell-${row.id}-sku-value`}
              >
                {sku}
              </span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "product",
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-product">
            <span data-testid="inventory-table-header-product-text">{t("fields.product")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const productTitle =
            getInventoryItemLinks(row.original).variants?.[0]?.product?.title

          if (!productTitle) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span
                className="truncate"
                data-testid={`inventory-table-cell-${row.id}-product-value`}
              >
                {productTitle}
              </span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "store",
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-store">
            <span data-testid="inventory-table-header-store-text">{t("inventory.store")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const store = getInventoryItemLinks(row.original).seller?.name

          if (!store) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span
                className="truncate"
                data-testid={`inventory-table-cell-${row.id}-store-value`}
              >
                {store}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor("stocked_quantity", {
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-stocked-quantity">
            <span data-testid="inventory-table-header-stocked-quantity-text">{t("fields.inStock")}</span>
          </div>
        ),
        cell: ({ getValue, row }) => {
          const quantity = getValue()

          if (Number.isNaN(quantity)) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span
                className="truncate"
                data-testid={`inventory-table-cell-${row.id}-stocked_quantity-value`}
              >
                {quantity}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor("reserved_quantity", {
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-reserved-quantity">
            <span data-testid="inventory-table-header-reserved-quantity-text">{t("inventory.reserved")}</span>
          </div>
        ),
        cell: ({ getValue, row }) => {
          const quantity = getValue()

          if (Number.isNaN(quantity)) {
            return <PlaceholderCell />
          }

          return (
            <div className="flex size-full items-center overflow-hidden">
              <span
                className="truncate"
                data-testid={`inventory-table-cell-${row.id}-reserved_quantity-value`}
              >
                {quantity}
              </span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => (
          <div className="flex h-full w-full items-center" data-testid="inventory-table-header-actions">
            <span data-testid="inventory-table-header-actions-text"></span>
          </div>
        ),
        cell: ({ row }) => <InventoryActions item={row.original} />,
      }),
    ],
    [t]
  )
}
