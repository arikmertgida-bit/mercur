import { ReturnDTO } from "@medusajs/types"
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { _DataTable } from "@components/table/data-table"
import { useDataTable } from "@hooks/use-data-table"
import { useDate } from "@hooks/use-date"
import { useReturnTableQuery } from "@hooks/table/query/use-return-table-query"
import { useMarkReturnSeen, useReturns } from "@hooks/api/returns"

const PAGE_SIZE = 20

const STATUS_COLOR: Record<string, "grey" | "orange" | "green" | "blue" | "red"> = {
  open: "grey",
  requested: "orange",
  received: "green",
  partially_received: "blue",
  canceled: "red",
}

export const ReturnListTable = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { searchParams, raw } = useReturnTableQuery({ pageSize: PAGE_SIZE })

  const { returns, count, isPending, isError, error } = useReturns(searchParams, {
    placeholderData: keepPreviousData,
  })

  const { mutate: markSeen } = useMarkReturnSeen()

  const columns = useColumns()

  const { table } = useDataTable({
    data: returns ?? [],
    columns,
    count,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y px-0 py-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("returns.domain")}</Heading>
        </div>
      </div>
      <_DataTable
        table={table}
        queryObject={raw}
        count={count}
        isLoading={isPending}
        columns={columns}
        pageSize={PAGE_SIZE}
        noHeader
        pagination
        onRowClick={(row) => {
          markSeen(row.original.id)
          navigate(`/orders/${row.original.order_id}`)
        }}
        noRecords={{ message: t("returns.noRecords") }}
      />
    </Container>
  )
}

const columnHelper = createColumnHelper<ReturnDTO>()

const useColumns = () => {
  const { t } = useTranslation()
  const { getFullDate } = useDate()

  return useMemo(
    () => [
      columnHelper.display({
        id: "display_id",
        header: () => t("fields.order"),
        cell: ({ row }) => (
          <Text size="small">
            #{row.original.order?.display_id ?? row.original.display_id}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "email",
        header: () => t("fields.customer"),
        cell: ({ row }) => (
          <Text size="small" className="text-ui-fg-subtle">
            {row.original.order?.email ?? "-"}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "items",
        header: () => t("fields.item"),
        cell: ({ row }) => (
          <Text size="small" className="text-ui-fg-subtle">
            {row.original.items.length}
          </Text>
        ),
      }),
      columnHelper.accessor("status", {
        header: () => t("fields.status"),
        cell: ({ getValue }) => {
          const status = getValue()
          return (
            <StatusBadge color={STATUS_COLOR[status] ?? "grey"}>
              {t(`returns.status.${status}`)}
            </StatusBadge>
          )
        },
      }),
      columnHelper.display({
        id: "requested_at",
        header: () => t("fields.createdAt"),
        cell: ({ row }) => (
          <Text size="small" className="text-ui-fg-subtle">
            {row.original.requested_at
              ? getFullDate({ date: row.original.requested_at, includeTime: true })
              : "-"}
          </Text>
        ),
      }),
    ],
    [t, getFullDate]
  )
}
