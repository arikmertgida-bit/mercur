import { HttpTypes } from "@medusajs/types"
import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { z } from "zod"

import { useQueryParams } from "../../../../../hooks/use-query-params"
import { PriceListStatus } from "../../../common/constants"

const StatusListSchema = z.array(z.enum(PriceListStatus))

export const usePricingTableQuery = ({
  pageSize = 20,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    ["offset", "q", "order", "status", "starts_at", "ends_at"],
    prefix
  )

  const status = StatusListSchema.safeParse(raw.status?.split(","))

  const searchParams: HttpTypes.AdminPriceListListParams = {
    limit: pageSize,
    offset: raw.offset ? Number(raw.offset) : 0,
    order: raw.order,
    status: status.success ? status.data : undefined,
    starts_at: parseJsonQueryParam(raw.starts_at, DateComparisonFilterSchema),
    ends_at: parseJsonQueryParam(raw.ends_at, DateComparisonFilterSchema),
    q: raw.q,
  }

  return {
    searchParams,
    raw,
  }
}
