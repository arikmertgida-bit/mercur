import { LoaderFunctionArgs } from "react-router-dom"

import { variantsQueryKeys } from "../../../hooks/api/products"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const VARIANT_DETAIL_FIELDS = "*options,*options.option"

const variantDetailQuery = (productId: string, variantId: string) => ({
  queryKey: variantsQueryKeys.detail(variantId, { fields: VARIANT_DETAIL_FIELDS }),
  queryFn: async () =>
    sdk.admin.products.$id.variants.$variantId.query({
      $id: productId,
      $variantId: variantId,
      fields: VARIANT_DETAIL_FIELDS,
    }),
})

export const variantLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = variantDetailQuery(
    getRequiredParam(params, "id"),
    getRequiredParam(params, "variant_id")
  )

  return queryClient.ensureQueryData(query)
}
