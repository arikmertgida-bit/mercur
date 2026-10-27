import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseCustomerGroupTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useCustomerGroupTableQuery = ({
  prefix,
  pageSize = 20,
}: UseCustomerGroupTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "has_account", "order", "created_at", "updated_at"],
    prefix
  )

  const { offset, created_at, updated_at, q, order } = queryObject

  const searchParams: HttpTypes.AdminGetCustomerGroupsParams = {
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
