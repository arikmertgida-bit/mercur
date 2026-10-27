import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"

import { useQueryParams } from "@hooks/use-query-params"

export const useShippingProfileTableQuery = ({
  pageSize = 20,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at", "name", "type"],
    prefix
  )

  const searchParams = {
    limit: pageSize,
    offset: raw.offset ? parseInt(raw.offset) : 0,
    q: raw.q,
    order: raw.order,
    created_at: parseJsonQueryParam(raw.created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(raw.updated_at, DateComparisonFilterSchema),
    name: raw.name,
    type: raw.type,
  }

  return {
    searchParams,
    raw,
  }
}
