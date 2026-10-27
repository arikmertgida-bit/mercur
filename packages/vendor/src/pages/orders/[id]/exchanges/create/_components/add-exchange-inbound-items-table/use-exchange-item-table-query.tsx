import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { useQueryParams } from "@hooks/use-query-params"

export const useExchangeItemTableQuery = ({
  pageSize = 50,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    ["q", "offset", "order", "created_at", "updated_at"],
    prefix
  )

  const { offset, created_at, updated_at, ...rest } = raw

  const searchParams = {
    ...rest,
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
  }

  return { searchParams, raw }
}
