import {
  NumberFilterValueSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"

import { useQueryParams } from "@hooks/use-query-params"

export const useLocationLevelTableQuery = ({
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
      "stocked_quantity",
      "reserved_quantity",
      "incoming_quantity",
      "available_quantity",
      "*stock_locations",
    ],
    prefix
  )

  const { reserved_quantity, stocked_quantity, available_quantity, ...params } =
    raw

  const searchParams = {
    limit: pageSize,
    reserved_quantity: parseJsonQueryParam(
      reserved_quantity,
      NumberFilterValueSchema
    ),
    stocked_quantity: parseJsonQueryParam(
      stocked_quantity,
      NumberFilterValueSchema
    ),
    available_quantity: parseJsonQueryParam(
      available_quantity,
      NumberFilterValueSchema
    ),
    ...params,
  }

  return {
    searchParams,
    raw,
  }
}
