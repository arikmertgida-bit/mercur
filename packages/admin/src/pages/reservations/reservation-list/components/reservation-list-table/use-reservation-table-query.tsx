import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useReservationTableQuery = ({
  pageSize = 20,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    [
      "q",
      "sku",
      "seller_id",
      "location_id",
      "offset",
      "created_at",
      "quantity",
      "updated_at",
      "order",
    ],
    prefix
  )

  const { location_id, created_at, updated_at, order, offset, ...rest } = raw

  const searchParams: HttpTypes.AdminGetReservationsParams = {
    limit: pageSize,
    offset: offset ? parseInt(offset) : undefined,
    location_id: location_id,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    order: order ?? "inventory_item.title",
    ...rest,
  }

  return {
    searchParams,
    raw,
  }
}
