import { HttpTypes } from "@mercurjs/types";
import { UIMatch } from "react-router-dom";

import { useCampaign } from "@hooks/api/campaigns";

import { CAMPAIGN_DETAIL_FIELDS } from "./constants";

type CampaignDetailBreadcrumbProps = UIMatch<HttpTypes.VendorCampaignResponse>;

export const Breadcrumb = (props: CampaignDetailBreadcrumbProps) => {
  const { id } = props.params || {};

  const { campaign } = useCampaign(
    id ?? "",
    {
      fields: CAMPAIGN_DETAIL_FIELDS,
    },
    {
      initialData: props.data,
      enabled: Boolean(id),
    },
  );

  if (!campaign) {
    return null;
  }

  return <span>{campaign.name}</span>;
};
