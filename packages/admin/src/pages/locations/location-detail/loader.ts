import { LoaderFunctionArgs } from "react-router-dom"

import { stockLocationsQueryKeys } from "../../../hooks/api/stock-locations"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { getRequiredParam } from "@lib/route-params"
import { LOCATION_DETAILS_FIELD } from "./constants"

const locationQuery = (id: string) => ({
  queryKey: stockLocationsQueryKeys.detail(id, {
    fields: LOCATION_DETAILS_FIELD,
  }),
  queryFn: async () =>
    sdk.admin.stockLocations.$id.query({
      $id: id,
      fields: LOCATION_DETAILS_FIELD,
    }),
})

export const locationLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = locationQuery(getRequiredParam(params, "location_id"))

  return queryClient.ensureQueryData(query)
}
