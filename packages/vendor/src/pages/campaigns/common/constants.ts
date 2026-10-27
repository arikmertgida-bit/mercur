import { CreateCampaignValues } from "./schema"

export const DEFAULT_CAMPAIGN_VALUES: CreateCampaignValues = {
  name: "",
  description: "",
  campaign_identifier: "",
  starts_at: null,
  ends_at: null,
  budget: {
    type: "usage",
    currency_code: null,
    limit: null,
    attribute: null,
  },
}
