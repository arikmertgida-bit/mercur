import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { useQueryParams } from "../../use-query-params"

type UseCampaignTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useCampaignTableQuery = ({
  prefix,
  pageSize = 20,
}: UseCampaignTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "order",
      "created_at",
      "updated_at",
      "seller_id",
      "budget_type",
      "status",
    ],
    prefix
  )

  const {
    offset,
    q,
    order,
    created_at,
    updated_at,
    seller_id,
    budget_type,
    status,
  } = queryObject

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order: order || "-created_at",
    fields: "+seller.id,+seller.name,+budget.type",
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    seller_id: seller_id || undefined,
    budget_type: budget_type || undefined,
    status: status || undefined,
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
