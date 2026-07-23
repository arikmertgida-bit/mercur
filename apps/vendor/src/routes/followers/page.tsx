import { useTranslation } from "react-i18next"
import { keepPreviousData } from "@tanstack/react-query"
import { Container, Heading, Text } from "@medusajs/ui"
import { UserGroup } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"

import { _DataTable, SingleColumnPage, useDataTable } from "@mercurjs/dashboard-shared"
import { useFollowers } from "../../hooks/api/followers"
import { useFollowerTableColumns } from "../../hooks/table/columns/use-follower-table-columns"
import { useFollowerTableQuery } from "../../hooks/table/query/use-follower-table-query"

const PAGE_SIZE = 20
// Follow/unfollow happens from the storefront, a separate session — the vendor
// panel has no push channel for it, so the header count polls instead.
const FOLLOWER_COUNT_REFETCH_INTERVAL_MS = 5_000

const FollowersListPage = () => {
  const { t } = useTranslation()
  const { searchParams, raw } = useFollowerTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { followers, count, isError, error, isLoading } = useFollowers(
    searchParams,
    {
      placeholderData: keepPreviousData,
      refetchInterval: FOLLOWER_COUNT_REFETCH_INTERVAL_MS,
    },
  )

  const columns = useFollowerTableColumns()

  const { table } = useDataTable({
    data: followers ?? [],
    columns,
    enablePagination: true,
    count: count,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>{t("followers.domain")}</Heading>
          <Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
            {t("followers.count", { count: count ?? 0 })}
          </Text>
        </div>
        <_DataTable
          columns={columns}
          table={table}
          pagination
          count={count}
          isLoading={isLoading}
          pageSize={PAGE_SIZE}
          queryObject={raw}
          noRecords={{
            message: t("followers.noRecords"),
          }}
        />
      </Container>
    </SingleColumnPage>
  )
}

export default FollowersListPage

export const config: RouteConfig = {
  label: "domain",
  translationNs: "followers",
  icon: UserGroup,
  rank: 91,
}
