import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

import { useQueryParams } from "../../../../hooks/use-query-params"
import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"

type UseSalesChannelTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useSalesChannelTableQuery = ({
  prefix,
  pageSize = 20,
}: UseSalesChannelTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at", "is_disabled"],
    prefix
  )

  const { offset, created_at, updated_at, is_disabled, ...rest } = queryObject

  const searchParams: HttpTypes.AdminSalesChannelListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    is_disabled: parseJsonQueryParam(is_disabled, z.boolean()),
    ...rest,
  }

  return searchParams
}
