import { HttpTypes } from "@medusajs/types"
import {
  RangeNumberFilterValueSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"

import { useQueryParams } from "../../../../hooks/use-query-params"
import { toNumberFilterValue } from "../../../../lib/number-filter"

export const useInventoryTableQuery = ({
  pageSize = 20,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    [
      "id",
      "location_id",
      "seller_id",
      "q",
      "order",
      "offset",
      "sku",
      "material",
      "mid_code",
      "hs_code",
      "width",
      "height",
    ],
    prefix
  )

  const { offset, width, height, ...params } = raw

  const searchParams: HttpTypes.AdminInventoryItemsParams & {
    seller_id?: string[]
  } = {
    limit: pageSize,
    offset: offset ? parseInt(offset) : undefined,
    // The table's number filter chips write `{ gt, lt }` (see NumberFilter).
    width: toNumberFilterValue(
      parseJsonQueryParam(width, RangeNumberFilterValueSchema)
    ),
    height: toNumberFilterValue(
      parseJsonQueryParam(height, RangeNumberFilterValueSchema)
    ),
    q: params.q,
    sku: params.sku,
    order: params.order || "title",
    mid_code: params.mid_code,
    hs_code: params.hs_code,
    material: params.material,
    location_levels: {
      location_id: params.location_id || [],
    },
    seller_id: params.seller_id ? params.seller_id.split(",") : undefined,
    id: params.id ? params.id.split(",") : undefined,
  }

  return {
    searchParams,
    raw,
  }
}
