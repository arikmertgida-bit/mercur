import { LoaderFunctionArgs } from "react-router-dom";
import { getLinkQuery } from "@mercurjs/dashboard-shared";

import { campaignsQueryKeys } from "@hooks/api/campaigns";
import { sdk } from "@lib/client";
import { queryClient } from "@lib/query-client";
import { getRequiredParam } from "@lib/route-params";

import { CAMPAIGN_DETAIL_FIELDS } from "./constants";

const campaignDetailQuery = (id: string) => {
  const query = getLinkQuery("campaign", CAMPAIGN_DETAIL_FIELDS);
  return {
    queryKey: campaignsQueryKeys.detail(id, query),
    queryFn: async () => sdk.vendor.campaigns.$id.query({ $id: id, ...query }),
  };
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const query = campaignDetailQuery(getRequiredParam(params, "id"));

  return queryClient.ensureQueryData(query);
};
