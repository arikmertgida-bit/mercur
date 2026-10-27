import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../../../../hooks/use-query-params"

type UseApiKeyManagementTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useApiKeyManagementTableQuery = ({
  prefix,
  pageSize = 20,
}: UseApiKeyManagementTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "created_at", "updated_at", "revoked_at", "order"],
    prefix
  )

  const { offset, created_at, updated_at, revoked_at, q, order } = queryObject

  const searchParams: HttpTypes.AdminGetApiKeysParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    revoked_at: parseJsonQueryParam(revoked_at, DateComparisonFilterSchema),
    order,
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
