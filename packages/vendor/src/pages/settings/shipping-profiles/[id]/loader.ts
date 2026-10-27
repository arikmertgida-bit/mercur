import { LoaderFunctionArgs } from "react-router-dom"

import { shippingProfileQueryKeys } from "@hooks/api/shipping-profiles"
import { sdk } from "@lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "@lib/query-client"

const shippingProfileQuery = (id: string) => ({
  queryKey: shippingProfileQueryKeys.detail(id),
  queryFn: async () => sdk.vendor.shippingProfiles.$id.query({ $id: id }),
})

export const shippingProfileLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = shippingProfileQuery(getRequiredParam(params, "shipping_profile_id"))

  return queryClient.ensureQueryData(query)
}
