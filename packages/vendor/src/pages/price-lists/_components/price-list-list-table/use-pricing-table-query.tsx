import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

import { useQueryParams } from "@hooks/use-query-params"
import { PriceListStatus } from "../../common/constants"

const StatusListSchema = z.array(z.enum(PriceListStatus))

export const usePricingTableQuery = ({
  pageSize = 20,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(["offset", "q", "order", "status"], prefix)

  const status = StatusListSchema.safeParse(raw.status?.split(","))

  const searchParams: HttpTypes.AdminPriceListListParams = {
    limit: pageSize,
    offset: raw.offset ? Number(raw.offset) : 0,
    order: raw.order,
    status: status.success ? status.data : undefined,
    q: raw.q,
  }

  return {
    searchParams,
    raw,
  }
}
