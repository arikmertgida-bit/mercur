import { LoaderFunctionArgs } from "react-router-dom"

import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { variantsQueryKeys } from "@/hooks/api"
import { getRequiredParam } from "@lib/route-params"
import { resolveEditVariantId } from "./variant-id"

const queryFn = async (id: string, variantId: string) => {
  return await sdk.admin.products.$id.variants.$variantId.query({
    $id: id,
    $variantId: variantId,
  })
}

const editProductVariantQuery = (id: string, variantId: string) => ({
  queryKey: variantsQueryKeys.detail(variantId),
  queryFn: async () => queryFn(id, variantId),
})

export const editProductVariantLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  const id = getRequiredParam(params, "id")
  const variantId = resolveEditVariantId(
    params.variant_id,
    new URL(request.url).searchParams.get("variant_id")
  )

  const query = editProductVariantQuery(id, variantId)

  return queryClient.ensureQueryData(query)
}
