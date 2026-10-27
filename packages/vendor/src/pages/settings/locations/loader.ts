import { LoaderFunctionArgs } from "react-router-dom"

import { stockLocationsQueryKeys } from "@hooks/api/stock-locations"
import { sdk } from "@lib/client"
import { queryClient } from "@lib/query-client"
import { LOCATION_LIST_FIELDS } from "./constants"

const shippingListQuery = () => {
  const query = { fields: LOCATION_LIST_FIELDS }
  return {
    queryKey: stockLocationsQueryKeys.list(query),
    queryFn: async () => sdk.vendor.stockLocations.query(query),
  }
}

export const shippingListLoader = async (_: LoaderFunctionArgs) => {
  return queryClient.ensureQueryData(shippingListQuery())
}
