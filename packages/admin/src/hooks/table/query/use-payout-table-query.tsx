import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { useQueryParams } from "../../use-query-params"

type UsePayoutTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const usePayoutTableQuery = ({
  prefix,
  pageSize = 20,
}: UsePayoutTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at", "status"],
    prefix,
  )

  const { offset, q, order, created_at, updated_at, status } = queryObject

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    q,
    order: order ?? "-created_at",
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    status: status?.split(","),
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
