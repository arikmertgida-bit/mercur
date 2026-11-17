import {
  createCampaignsWorkflow,
  createPromotionsWorkflow,
  updateCampaignsWorkflow,
  updatePromotionsWorkflow,
} from "@medusajs/core-flows"

import {
  assertCampaignsFitBudgets,
  assertPromotionsFitCampaignBudgets,
} from "../../lib/campaign-budget-attribute"

// Throwing here fails the workflow, which compensates the create/update.
createPromotionsWorkflow.hooks.promotionsCreated(async ({ promotions }, { container }) => {
  await assertPromotionsFitCampaignBudgets(
    container,
    promotions.map((promotion) => promotion.id)
  )
})

updatePromotionsWorkflow.hooks.promotionsUpdated(async ({ promotions }, { container }) => {
  await assertPromotionsFitCampaignBudgets(
    container,
    promotions.map((promotion) => promotion.id)
  )
})

createCampaignsWorkflow.hooks.campaignsCreated(async ({ campaigns }, { container }) => {
  await assertCampaignsFitBudgets(
    container,
    campaigns.map((campaign) => campaign.id)
  )
})

updateCampaignsWorkflow.hooks.campaignsUpdated(async ({ campaigns }, { container }) => {
  await assertCampaignsFitBudgets(
    container,
    campaigns.map((campaign) => campaign.id)
  )
})
