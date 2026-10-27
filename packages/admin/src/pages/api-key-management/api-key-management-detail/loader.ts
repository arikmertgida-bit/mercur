import { LoaderFunctionArgs } from "react-router-dom"

import { apiKeysQueryKeys } from "../../../hooks/api/api-keys"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const apiKeyDetailQuery = (id: string) => ({
  queryKey: apiKeysQueryKeys.detail(id),
  queryFn: async () => sdk.admin.apiKeys.$id.query({ $id: id }),
})

export const apiKeyLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = apiKeyDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
