import { QueryClient } from "@tanstack/react-query"
import { LoaderFunctionArgs } from "react-router-dom"
import { getLinkQuery } from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@mercurjs/types"

import { productsQueryKeys } from "../../../hooks/api/products"
import { sdk } from "../../../lib/client"

const LIST_FIELDS =
  "id,title,handle,status,*collection,*categories,variants.id,thumbnail"

const productsListQuery = () => {
  const { fields } = getLinkQuery("product", LIST_FIELDS)
  return {
    queryKey: productsQueryKeys.list({ limit: 20, offset: 0, fields }),
    queryFn: async () =>
      sdk.admin.products.query({ limit: 20, offset: 0, fields }),
  }
}

export const productsLoader = (client: QueryClient) => {
  return async (
    _args: LoaderFunctionArgs
  ): Promise<HttpTypes.AdminProductListResponse> => {
    return client.ensureQueryData(productsListQuery())
  }
}
