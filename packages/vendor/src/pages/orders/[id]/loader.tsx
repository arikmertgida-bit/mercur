import { getLinkQuery } from "@mercurjs/dashboard-shared";
import { LoaderFunctionArgs } from "react-router-dom";

import { ordersQueryKeys } from "@hooks/api/orders";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

import { DEFAULT_FIELDS } from "./constants";

const orderDetailQuery = (id: string) => {
  const { fields } = getLinkQuery("order", DEFAULT_FIELDS);
  return {
    queryKey: ordersQueryKeys.detail(id, { fields }),
    queryFn: async () => sdk.vendor.orders.$id.query({ $id: id, fields }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = orderDetailQuery(getRequiredParam(params, "id"));

  return queryClient.ensureQueryData(query);
};
