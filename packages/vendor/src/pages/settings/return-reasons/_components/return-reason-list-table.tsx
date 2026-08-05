import { Button, Container, Heading, Text } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { _DataTable } from "@components/table/data-table"
import { useReturnReasons } from "@hooks/api/return-reasons"
import { useReturnReasonTableColumns } from "@hooks/table/columns"
import { useReturnReasonTableQuery } from "@hooks/table/query"
import { useDataTable } from "@hooks/use-data-table"

const PAGE_SIZE = 20

export const ReturnReasonListTable = () => {
  const { t } = useTranslation()
  const { searchParams, raw } = useReturnReasonTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { return_reasons, count, isPending, isError, error } = useReturnReasons(
    searchParams,
    {
      placeholderData: keepPreviousData,
    }
  )

  const columns = useReturnReasonTableColumns()

  const { table } = useDataTable({
    data: return_reasons,
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
          <Heading>{t("returnReasons.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("returnReasons.subtitle")}
          </Text>
        </div>
        <Button variant="secondary" size="small" asChild>
          <Link to="/requests/return-reasons/create">
            {t("returnReasons.requestAction")}
          </Link>
        </Button>
      </div>
      <_DataTable
        table={table}
        queryObject={raw}
        count={count}
        isLoading={isPending}
        columns={columns}
        pageSize={PAGE_SIZE}
        noHeader={true}
        pagination
        search
      />
    </Container>
  )
}
