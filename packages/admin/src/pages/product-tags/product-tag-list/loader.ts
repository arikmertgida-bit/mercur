import { LoaderFunctionArgs } from "react-router-dom"
import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared"

import { productTagsQueryKeys } from "../../../hooks/api"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { InferClientInput } from "@mercurjs/client"

const productTagListQuery = (query?: InferClientInput<typeof sdk.admin.productTags.query>) => ({
  queryKey: productTagsQueryKeys.list(query),
  queryFn: async () => sdk.admin.productTags.query({ ...query }),
})

export const productTagListLoader = async ({ request }: LoaderFunctionArgs) => {
  const searchParams = new URL(request.url).searchParams
  const offset = searchParams.get("offset")

  // The list's URL filters, validated the same way the table query reads them.
  const query = productTagListQuery({
    q: searchParams.get("q") ?? undefined,
    order: searchParams.get("order") ?? undefined,
    offset: offset ? Number(offset) : undefined,
    created_at: parseJsonQueryParam(
      searchParams.get("created_at") ?? undefined,
      DateComparisonFilterSchema
    ),
    updated_at: parseJsonQueryParam(
      searchParams.get("updated_at") ?? undefined,
      DateComparisonFilterSchema
    ),
  })

  return queryClient.ensureQueryData(query)
}
