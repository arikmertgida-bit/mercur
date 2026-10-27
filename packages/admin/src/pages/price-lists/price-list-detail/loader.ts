import { getLinkQuery } from "@mercurjs/dashboard-shared"
import { LoaderFunctionArgs } from "react-router-dom"
import { priceListsQueryKeys } from "../../../hooks/api/price-lists"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const pricingDetailQuery = (id: string) => {
  const query = getLinkQuery("price_list")

  return {
    queryKey: priceListsQueryKeys.detail(id, query),
    queryFn: async () => sdk.admin.priceLists.$id.query({ $id: id, ...query }),
  }
}

export const pricingLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = pricingDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
