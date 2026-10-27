import { LoaderFunctionArgs } from "react-router-dom"
import { regionsQueryKeys } from "../../../hooks/api/regions"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { REGION_DETAIL_FIELDS } from "./constants"
import { getRequiredParam } from "@lib/route-params"

const regionQuery = (id: string) => ({
  queryKey: regionsQueryKeys.detail(id),
  queryFn: async () =>
    sdk.admin.regions.$id.query({ $id: id, fields: REGION_DETAIL_FIELDS }),
})

export const regionLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = regionQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
