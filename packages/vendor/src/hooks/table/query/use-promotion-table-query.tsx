import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UsePromotionTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const usePromotionTableQuery = ({
  prefix,
  pageSize = 20,
}: UsePromotionTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "order",
      "created_at",
      "updated_at",
      "campaign_id",
      "is_automatic",
      "application_method_type",
    ],
    prefix
  )

  const {
    offset,
    q,
    order,
    created_at,
    updated_at,
    campaign_id,
    is_automatic,
    application_method_type,
  } = queryObject

  const searchParams: HttpTypes.AdminGetPromotionsParams & {
    is_automatic?: boolean
    campaign_id?: string
    application_method?: { type?: string }
  } = {
    limit: pageSize,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    campaign_id: campaign_id || undefined,
    is_automatic: is_automatic ? is_automatic === "true" : undefined,
    application_method: application_method_type
      ? { type: application_method_type }
      : undefined,
    offset: offset ? Number(offset) : 0,
    order: order || "-created_at",
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
