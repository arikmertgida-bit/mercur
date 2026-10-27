import { LoaderFunctionArgs } from "react-router-dom"

import { productTagsQueryKeys } from "../../../hooks/api"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const productTagDetailQuery = (id: string) => ({
  queryKey: productTagsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.productTags.$id.query({ $id: id }),
})

export const productTagLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = productTagDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
