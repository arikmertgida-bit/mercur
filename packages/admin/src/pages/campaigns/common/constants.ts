import { CampaignBudgetTypeValues } from "@medusajs/types"

const DEFAULT_BUDGET_TYPE: Extract<CampaignBudgetTypeValues, "usage"> = "usage"

export const DEFAULT_CAMPAIGN_VALUES = {
  name: "",
  description: "",
  campaign_identifier: "",
  starts_at: null,
  ends_at: null,
  budget: {
    type: DEFAULT_BUDGET_TYPE,
    currency_code: null,
    limit: null,
    attribute: null,
  },
}
