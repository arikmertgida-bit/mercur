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
    ["offset", "q", "status", "created_at", "updated_at", "order"],
    prefix
  )

  const { offset, status, created_at, updated_at, q, order } = queryObject

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    status: status?.split(","),
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    order: order ? order : "-created_at",
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
