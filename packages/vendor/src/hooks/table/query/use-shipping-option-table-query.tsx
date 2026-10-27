import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseShippingOptionTableQueryProps = {
  regionId: string
  isReturn?: boolean
  pageSize?: number
  prefix?: string
}

export const useShippingOptionTableQuery = ({
  regionId: _regionId,
  pageSize = 10,
  prefix,
}: UseShippingOptionTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "order",
      "admin_only",
      "is_return",
      "created_at",
      "updated_at",
      "stock_location_id",
    ],
    prefix
  )

  const {
    offset,
    order,
    q,
    created_at,
    updated_at,
    stock_location_id,
  } = queryObject

  const searchParams: HttpTypes.AdminShippingOptionListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    // TODO: We don't allow region_id in the API yet
    // region_id: regionId,

    // TODO: not supported
    // is_return: is_return ? is_return === "true" : undefined,
    // admin_only: admin_only ? admin_only === "true" : undefined,
    q,
    order,
    stock_location_id,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
