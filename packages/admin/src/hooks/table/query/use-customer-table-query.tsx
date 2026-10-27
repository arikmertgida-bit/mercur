import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseCustomerTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useCustomerTableQuery = ({
  prefix,
  pageSize = 20,
}: UseCustomerTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "has_account",
      "groups",
      "order",
      "created_at",
      "updated_at",
    ],
    prefix
  )

  const { offset, groups, created_at, updated_at, has_account, q, order } =
    queryObject

  const searchParams: HttpTypes.AdminCustomerFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    groups: groups?.split(","),
    has_account: has_account ? has_account === "true" : undefined,
    order: order ? order : "-created_at",
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
