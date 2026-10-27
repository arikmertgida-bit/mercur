import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { DateCell } from "@components/table/table-cells/common/date-cell"
import { PlaceholderCell } from "@components/table/table-cells/common/placeholder-cell"
import { ExtendedReservationItem } from "../../../inventory/[id]/_components/reservations-table/use-reservation-list-table-columns"
import { z } from "zod"

const columnHelper = createColumnHelper<ExtendedReservationItem>()

const TruncatedTextCell = ({ value }: { value?: string | null }) => {
  if (!value) {
    return <PlaceholderCell />
  }

  return (
    <div className="flex size-full items-center overflow-hidden">
      <span className="truncate">{value}</span>
    </div>
  )
}

// The product is reached through Medusa's own inventory_item -> variants ->
// product relation (requested as `variants.product.title`), which the HTTP
// types don't declare — so it is read through this schema instead of a cast.
const InventoryItemProductSchema = z.object({
  variants: z
    .array(
      z.object({
        product: z.object({ title: z.string() }).nullish(),
      })
    )
    .nullish(),
})

// to a placeholder when the link isn't populated.
const getProductTitle = (reservation: ExtendedReservationItem) => {
  const parsed = InventoryItemProductSchema.safeParse(reservation.inventory_item)
  return parsed.success
    ? parsed.data.variants?.[0]?.product?.title ?? undefined
    : undefined
}

export const useReservationTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("inventory_item.title", {
        header: t("fields.title"),
        cell: ({ getValue }) => <TruncatedTextCell value={getValue()} />,
      }),
      columnHelper.accessor("inventory_item.sku", {
        header: t("fields.sku"),
        cell: ({ getValue }) => <TruncatedTextCell value={getValue()} />,
      }),
      columnHelper.display({
        id: "product",
        header: t("fields.product"),
        cell: ({ row }) => (
          <TruncatedTextCell value={getProductTitle(row.original)} />
        ),
      }),
      columnHelper.accessor("description", {
        header: t("fields.description"),
        cell: ({ getValue }) => <TruncatedTextCell value={getValue()} />,
      }),
      columnHelper.accessor("quantity", {
        header: t("fields.quantity"),
        cell: ({ getValue }) => (
          <div className="flex size-full items-center overflow-hidden">
            <span className="truncate">{getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: t("fields.date"),
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
    ],
    [t]
  )
}
