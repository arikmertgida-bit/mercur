import { LoaderFunctionArgs } from "react-router-dom";

import { getLinkQuery } from "@mercurjs/dashboard-shared";

import { inventoryItemsQueryKeys } from "@hooks/api/inventory";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

import { INVENTORY_DETAIL_FIELDS } from "./constants";

const inventoryDetailQuery = (id: string) => {
  const query = getLinkQuery("inventory_item", INVENTORY_DETAIL_FIELDS);
  return {
    queryKey: inventoryItemsQueryKeys.detail(id, query),
    queryFn: async () =>
      sdk.vendor.inventoryItems.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = inventoryDetailQuery(getRequiredParam(params, "id"));
  return queryClient.ensureQueryData(query);
};
