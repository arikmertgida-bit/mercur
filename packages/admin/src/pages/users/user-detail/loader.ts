import { LoaderFunctionArgs } from "react-router-dom"

import { productsQueryKeys } from "../../../hooks/api/products"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const userDetailQuery = (id: string) => ({
  queryKey: productsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.users.$id.query({ $id: id }),
})

export const userLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = userDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
