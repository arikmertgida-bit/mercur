import { LoaderFunctionArgs } from "react-router-dom"
import { getLinkQuery } from "@mercurjs/dashboard-shared"
import { customersQueryKeys } from "../../../hooks/api/customers"
import { sdk } from "../../../lib/client"
import { getRequiredParam } from "@lib/route-params"
import { queryClient } from "../../../lib/query-client"

const customerDetailQuery = (id: string) => {
  const query = getLinkQuery("customer", "+*addresses")
  return {
    queryKey: customersQueryKeys.detail(id, query),
    queryFn: async () => sdk.admin.customers.$id.query({ $id: id, ...query }),
  }
}

export const customerLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = customerDetailQuery(getRequiredParam(params, "id"))

  return queryClient.ensureQueryData(query)
}
