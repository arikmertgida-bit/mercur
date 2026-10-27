import { LoaderFunctionArgs } from "react-router-dom"

import { productsQueryKeys } from "../../../hooks/api/products"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const salesChannelDetailQuery = (id: string) => ({
  queryKey: productsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.salesChannels.$id.query({ $id: id }),
})

export const salesChannelLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = salesChannelDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
