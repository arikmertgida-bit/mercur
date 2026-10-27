import { LoaderFunctionArgs } from "react-router-dom";

import { getLinkQuery } from "@mercurjs/dashboard-shared";

import { collectionsQueryKeys } from "@hooks/api/collections";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

const collectionDetailQuery = (id: string) => {
  const query = getLinkQuery("collection");
  return {
    queryKey: collectionsQueryKeys.detail(id, query),
    queryFn: async () =>
      sdk.vendor.collections.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = collectionDetailQuery(getRequiredParam(params, "id"));
  return queryClient.ensureQueryData(query);
};
