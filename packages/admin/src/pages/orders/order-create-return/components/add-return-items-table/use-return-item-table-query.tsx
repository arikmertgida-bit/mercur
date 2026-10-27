import {
  DateComparisonFilter,
  DateComparisonFilterSchema,
  parseJsonQueryParam,
  RangeNumberFilterValue,
  RangeNumberFilterValueSchema,
} from "@mercurjs/dashboard-shared"
import { useQueryParams } from "../../../../../hooks/use-query-params"

export type ReturnItemTableQuery = {
  q?: string
  offset: number
  order?: string
  created_at?: DateComparisonFilter
  updated_at?: DateComparisonFilter
  returnable_quantity?: RangeNumberFilterValue
  refundable_amount?: RangeNumberFilterValue
}

export const useReturnItemTableQuery = ({
  pageSize = 50,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    [
      "q",
      "offset",
      "order",
      "created_at",
      "updated_at",
      "returnable_quantity",
      "refundable_amount",
    ],
    prefix
  )

  const {
    offset,
    created_at,
    updated_at,
    refundable_amount,
    returnable_quantity,
    ...rest
  } = raw

  const searchParams = {
    ...rest,
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    refundable_amount: parseJsonQueryParam(
      refundable_amount,
      RangeNumberFilterValueSchema
    ),
    returnable_quantity: parseJsonQueryParam(
      returnable_quantity,
      RangeNumberFilterValueSchema
    ),
  }

  return { searchParams, raw }
}
