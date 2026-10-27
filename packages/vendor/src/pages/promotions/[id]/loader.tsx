import { getLinkQuery } from "@mercurjs/dashboard-shared";
import { LoaderFunctionArgs } from "react-router-dom";

import { promotionsQueryKeys } from "@hooks/api/promotions";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

const promotionDetailQuery = (id: string) => {
  const query = getLinkQuery("promotion", "+status");
  return {
    queryKey: promotionsQueryKeys.detail(id, query),
    queryFn: async () => sdk.vendor.promotions.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  return queryClient.ensureQueryData(
    promotionDetailQuery(getRequiredParam(params, "id"))
  );
};
