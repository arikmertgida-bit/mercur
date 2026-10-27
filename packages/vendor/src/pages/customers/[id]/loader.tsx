import { LoaderFunctionArgs } from "react-router-dom";

import { getLinkQuery } from "@mercurjs/dashboard-shared";
import { customersQueryKeys } from "@hooks/api/customers";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

const customerDetailQuery = (id: string) => {
  const query = getLinkQuery("customer", "*groups, *groups.customers");
  return {
    queryKey: customersQueryKeys.detail(id, query),
    queryFn: async () => sdk.vendor.customers.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = customerDetailQuery(getRequiredParam(params, "id"));
  return queryClient.ensureQueryData(query);
};
