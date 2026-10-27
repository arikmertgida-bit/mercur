import { getLinkQuery } from "@mercurjs/dashboard-shared"
import { LoaderFunctionArgs } from "react-router-dom"

import { categoriesQueryKeys } from "../../../hooks/api/categories"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const categoryDetailQuery = (id: string) => {
  const query = getLinkQuery("category")

  return {
    queryKey: categoriesQueryKeys.detail(id, query),
    queryFn: async () =>
      sdk.admin.productCategories.$id.query({ $id: id, ...query }),
  }
}

export const categoryLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = categoryDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
