import { LoaderFunctionArgs } from "react-router-dom"

import { variantsQueryKeys } from "@hooks/api/products"
import { sdk } from "@lib/client"
import { queryClient } from "@lib/query-client"
import { getVariantRouteParams } from "../common/route-params"

const VARIANT_EDIT_FIELDS = "*options,*options.option,*prices"

const queryFn = async (id: string, variantId: string) => {
  return await sdk.vendor.products.$id.variants.$variantId.query({
    $id: id,
    $variantId: variantId,
    fields: VARIANT_EDIT_FIELDS,
  })
}

const editProductVariantQuery = (id: string, variantId: string) => ({
  queryKey: variantsQueryKeys.detail(variantId, { fields: VARIANT_EDIT_FIELDS }),
  queryFn: async () => queryFn(id, variantId),
})

export const editProductVariantLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  const { productId, variantId } = getVariantRouteParams(
    params,
    new URL(request.url).searchParams
  )

  return queryClient.ensureQueryData(
    editProductVariantQuery(productId, variantId)
  )
}
