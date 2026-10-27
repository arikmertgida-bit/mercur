import { LoaderFunctionArgs } from "react-router-dom"
import { taxRegionsQueryKeys } from "../../../hooks/api/tax-regions"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const taxRegionDetailQuery = (id: string) => ({
  queryKey: taxRegionsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.taxRegions.$id.query({ $id: id }),
})

export const taxRegionLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = taxRegionDetailQuery(getRequiredParam(params, "province_id"))

  return queryClient.ensureQueryData(query)
}
