import { getLinkQuery } from "@mercurjs/dashboard-shared";
import { LoaderFunctionArgs } from "react-router-dom";

import { categoriesQueryKeys } from "@hooks/api/categories";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

const categoryDetailQuery = (id: string) => {
  const query = getLinkQuery("category");

  return {
    queryKey: categoriesQueryKeys.detail(id, query),
    queryFn: async () =>
      sdk.vendor.productCategories.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = categoryDetailQuery(getRequiredParam(params, "id"));

  return queryClient.ensureQueryData(query);
};
