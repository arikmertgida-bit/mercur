import { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { LoaderFunctionArgs } from "react-router-dom"

import { promotionsQueryKeys } from "../../../hooks/api/promotions"
import { sdk } from "../../../lib/client"

const params = {
  limit: 20,
  offset: 0,
}

const promotionsListQuery = () => ({
  queryKey: promotionsQueryKeys.list(params),
  queryFn: async () => sdk.admin.promotions.query(params),
})

export const promotionsLoader = (client: QueryClient) => {
  return async (
    _args: LoaderFunctionArgs
  ): Promise<HttpTypes.AdminPromotionListResponse> => {
    return client.ensureQueryData(promotionsListQuery())
  }
}
