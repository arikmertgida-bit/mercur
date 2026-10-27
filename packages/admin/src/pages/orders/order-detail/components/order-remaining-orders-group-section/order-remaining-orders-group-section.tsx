import { Container, Heading } from "@medusajs/ui"
import {
  DisplayExtensionZone,
  useRequiredParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@mercurjs/types"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "@components/table/data-table"
import {
  DateCell,
  DateHeader,
} from "@components/table/table-cells/common/date-cell"
import {
  TextCell,
  TextHeader,
} from "@components/table/table-cells/common/text-cell"
import {
  DisplayIdCell,
  DisplayIdHeader,
} from "@components/table/table-cells/order/display-id-cell"
import {
  FulfillmentStatusCell,
  FulfillmentStatusHeader,
} from "@components/table/table-cells/order/fulfillment-status-cell"
import {
  PaymentStatusCell,
  PaymentStatusHeader,
} from "@components/table/table-cells/order/payment-status-cell"
import {
  TotalCell,
  TotalHeader,
} from "@components/table/table-cells/order/total-cell"
import { useOrderGroupByOrderId } from "@hooks/api/order-groups"
import { useDataTable } from "@hooks/use-data-table"

const DEFAULT_FIELDS =
  "id,*orders,*orders.customer,*orders.seller,*orders.sales_channel"

type OrderWithSeller = HttpTypes.AdminOrderGroupOrder

export const OrderRemainingOrdersGroupSection = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const { order_group, isLoading, isError, error } = useOrderGroupByOrderId(
    id,
    { fields: DEFAULT_FIELDS }
  )

  const orders = useMemo(() => {
    if (!order_group?.orders) return []
    return order_group.orders.filter((o) => o.id !== id)
  }, [order_group, id])

  const columns = useColumns()

  const { table } = useDataTable({
    data: orders,
    columns,
    count: orders.length,
    enablePagination: true,
    pageSize: Math.max(orders.length, 1),
    getRowId: (row) => row.id,
  })

  if (isError) {
    throw error
  }

  if (!isLoading && orders.length === 0) {
    return null
  }

  return (
    <Container
      className="divide-y p-0"
      data-testid="order-remaining-orders-group-section"
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        data-testid="order-remaining-orders-group-header"
      >
        <Heading level="h2" data-testid="order-remaining-orders-group-heading">
          {t("orders.group.heading")}
        </Heading>
      </div>
      <_DataTable
        columns={columns}
        table={table}
        navigateTo={(row) => `/orders/${row.original.id}`}
        count={orders.length}
        isLoading={isLoading}
        pageSize={orders.length}
        noRecords={{
          message: t("orders.group.noOtherOrders"),
        }}
      />
      <DisplayExtensionZone
        model="order"
        zone="order-group"
        data={order_group}
      />
    </Container>
  )
}

const columnHelper = createColumnHelper<OrderWithSeller>()

const useColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("display_id", {
        header: () => <DisplayIdHeader />,
        cell: ({ getValue }) => <DisplayIdCell displayId={getValue()} />,
      }),
      columnHelper.display({
        id: "seller",
        header: () => <TextHeader text={t("fields.store")} />,
        cell: ({ row }) => {
          const seller = row.original.seller
          return <TextCell text={seller?.name ?? "-"} />
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue }) => <DateCell date={new Date(getValue())} />,
      }),
      columnHelper.accessor("payment_status", {
        header: () => <PaymentStatusHeader />,
        cell: ({ getValue }) => <PaymentStatusCell status={getValue()} />,
      }),
      columnHelper.accessor("fulfillment_status", {
        header: () => <FulfillmentStatusHeader />,
        cell: ({ getValue }) => <FulfillmentStatusCell status={getValue()} />,
      }),
      columnHelper.accessor("total", {
        header: () => <TotalHeader />,
        cell: ({ getValue, row }) => (
          <TotalCell
            currencyCode={row.original.currency_code}
            total={getValue()}
          />
        ),
      }),
    ],
    [t]
  )
}
