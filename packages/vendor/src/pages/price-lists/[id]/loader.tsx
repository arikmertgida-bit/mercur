import { LoaderFunctionArgs } from "react-router-dom";

import { getLinkQuery } from "@mercurjs/dashboard-shared";

import { priceListsQueryKeys } from "@hooks/api/price-lists";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

const pricingDetailQuery = (id: string) => {
  const query = getLinkQuery("price_list");
  return {
    queryKey: priceListsQueryKeys.detail(id, query),
    queryFn: async () => sdk.vendor.priceLists.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = pricingDetailQuery(getRequiredParam(params, "id"));

  return queryClient.ensureQueryData(query);
};
