import { HttpTypes } from "@medusajs/types"
import { TableOptions, createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import {
  DateCell,
  DateHeader,
} from "../../../components/table/table-cells/common/date-cell"
import {
  CustomerCell,
  CustomerHeader,
} from "../../../components/table/table-cells/order/customer-cell"
import {
  DisplayIdCell,
  DisplayIdHeader,
} from "../../../components/table/table-cells/order/display-id-cell"
import {
  FulfillmentStatusCell,
  FulfillmentStatusHeader,
} from "../../../components/table/table-cells/order/fulfillment-status-cell"
import {
  PaymentStatusCell,
  PaymentStatusHeader,
} from "../../../components/table/table-cells/order/payment-status-cell"
import {
  TotalCell,
  TotalHeader,
} from "../../../components/table/table-cells/order/total-cell"

const columnHelper = createColumnHelper<HttpTypes.AdminOrder>()

type OrderColumn = TableOptions<HttpTypes.AdminOrder>["columns"][number]

type UseOrderTableColumnsProps = {
  exclude?: string[]
}

export const useOrderTableColumns = (props: UseOrderTableColumnsProps) => {
  const { exclude = [] } = props ?? {}

  const columns = useMemo<TableOptions<HttpTypes.AdminOrder>["columns"]>(
    () => [
      columnHelper.accessor("display_id", {
        header: () => <DisplayIdHeader />,
        cell: ({ getValue }) => {
          const id = getValue()

          return <DisplayIdCell displayId={id} />
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue }) => {
          const date = new Date(getValue())

          return <DateCell date={date} />
        },
      }),
      columnHelper.accessor("customer", {
        header: () => <CustomerHeader />,
        cell: ({ getValue }) => {
          const customer = getValue()

          return <CustomerCell customer={customer} />
        },
      }),
      columnHelper.accessor("payment_status", {
        header: () => <PaymentStatusHeader />,
        cell: ({ getValue }) => {
          const status = getValue()

          return <PaymentStatusCell status={status} />
        },
      }),
      columnHelper.accessor("fulfillment_status", {
        header: () => <FulfillmentStatusHeader />,
        cell: ({ getValue }) => {
          const status = getValue()

          return <FulfillmentStatusCell status={status} />
        },
      }),
      columnHelper.accessor("total", {
        header: () => <TotalHeader />,
        cell: ({ getValue, row }) => {
            const isFullyRefunded = row.original.payment_status === "refunded"
            const total = !isFullyRefunded
              ? getValue()
              : row.original.payment_collections?.reduce(
                  (acc, payCol) => acc + (payCol.refunded_amount ?? 0),
                  0
                ) || 0
            const currencyCode = row.original.currency_code

            return (
              <TotalCell
                currencyCode={currencyCode}
                total={total}
                className={
                  isFullyRefunded ? "text-ui-fg-muted line-through" : ""
                }
              />
            )
        },
      }),
    ],
    []
  )

  const shouldExclude = (c: OrderColumn) => {
    if ("accessorKey" in c && typeof c.accessorKey === "string") {
      return exclude.includes(c.accessorKey)
    }

    return c.id !== undefined && exclude.includes(c.id)
  }

  return columns.filter((c) => !shouldExclude(c))
}
