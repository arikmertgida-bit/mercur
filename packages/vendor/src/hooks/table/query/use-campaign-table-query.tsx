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
    ["offset", "q", "order", "created_at", "updated_at", "budget_type", "status"],
    prefix
  )

  const { offset, q, order, created_at, updated_at, budget_type, status } =
    queryObject
  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order: order ?? "-created_at",
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    budget_type,
    status,
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
