import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { FindParams, HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseRegionTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useRegionTableQuery = ({
  prefix,
  pageSize = 20,
}: UseRegionTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at"],
    prefix
  )

  const { offset, q, order, created_at, updated_at } = queryObject

  const searchParams: FindParams & HttpTypes.AdminRegionFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
