import { MedusaContainer } from "@medusajs/framework/types"
import {
  CampaignBudgetType,
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

/**
 * Medusa's promotion module checks a "use by attribute" (per-customer)
 * campaign budget inside computeActions, before any rule matching, and throws
 * when the cart carries no value for the attribute. Automatic promotions are
 * computed for every cart, so one automatic promotion in such a campaign
 * broke add-to-cart for every guest on the whole marketplace. Only
 * customer_id and customer_email ever reach that context; any other
 * attribute (e.g. promotion_code) throws for every cart.
 *
 * Per-customer budgets therefore stay with code promotions, and only the two
 * attributes Medusa can evaluate are accepted.
 */
export const AUTOMATIC_PROMOTION_ATTRIBUTE_BUDGET_CODE = "automatic_promotion_attribute_budget"

const SUPPORTED_BUDGET_ATTRIBUTES: ReadonlySet<string> = new Set(["customer_id", "customer_email"])

const BudgetSchema = z
  .object({
    type: z.string(),
    attribute: z.string().nullish(),
  })
  .nullish()

const PromotionRowSchema = z.object({
  id: z.string(),
  is_automatic: z.boolean().nullish(),
  campaign: z.object({ id: z.string(), budget: BudgetSchema }).nullish(),
})

const CampaignRowSchema = z.object({
  id: z.string(),
  budget: BudgetSchema,
  promotions: z
    .array(z.object({ id: z.string(), is_automatic: z.boolean().nullish() }))
    .nullish(),
})

type Budget = z.infer<typeof BudgetSchema>

const isAttributeBudget = (budget: Budget): boolean =>
  budget?.type === CampaignBudgetType.USE_BY_ATTRIBUTE

const assertBudgetAttributeSupported = (budget: Budget): void => {
  if (!isAttributeBudget(budget)) {
    return
  }

  const attribute = budget?.attribute ?? ""
  if (!SUPPORTED_BUDGET_ATTRIBUTES.has(attribute)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Campaign budget attribute "${attribute}" is not supported. Use customer_id or customer_email.`
    )
  }
}

const automaticPromotionError = (): MedusaError =>
  new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Automatic promotions can't be added to a campaign with a per-customer budget. Use a promotion code instead.",
    AUTOMATIC_PROMOTION_ATTRIBUTE_BUDGET_CODE
  )

export const assertPromotionsFitCampaignBudgets = async (
  scope: MedusaContainer,
  promotionIds: string[]
): Promise<void> => {
  if (!promotionIds.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "promotion",
    fields: [
      "id",
      "is_automatic",
      "campaign.id",
      "campaign.budget.type",
      "campaign.budget.attribute",
    ],
    filters: { id: promotionIds },
  })

  for (const promotion of z.array(PromotionRowSchema).parse(data)) {
    const budget = promotion.campaign?.budget
    assertBudgetAttributeSupported(budget)

    if (promotion.is_automatic && isAttributeBudget(budget)) {
      throw automaticPromotionError()
    }
  }
}

export const assertCampaignsFitBudgets = async (
  scope: MedusaContainer,
  campaignIds: string[]
): Promise<void> => {
  if (!campaignIds.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "campaign",
    fields: [
      "id",
      "budget.type",
      "budget.attribute",
      "promotions.id",
      "promotions.is_automatic",
    ],
    filters: { id: campaignIds },
  })

  for (const campaign of z.array(CampaignRowSchema).parse(data)) {
    assertBudgetAttributeSupported(campaign.budget)

    if (
      isAttributeBudget(campaign.budget) &&
      (campaign.promotions ?? []).some((promotion) => promotion.is_automatic)
    ) {
      throw automaticPromotionError()
    }
  }
}

/** Checked before the link is made: addOrRemoveCampaignPromotionsWorkflow has no hook. */
export const assertPromotionsCanJoinCampaign = async (
  scope: MedusaContainer,
  campaignId: string,
  promotionIds: string[]
): Promise<void> => {
  if (!promotionIds.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [campaignRow],
  } = await query.graph({
    entity: "campaign",
    fields: ["id", "budget.type", "budget.attribute"],
    filters: { id: campaignId },
  })

  if (!campaignRow) {
    return
  }

  const campaign = CampaignRowSchema.parse(campaignRow)
  if (!isAttributeBudget(campaign.budget)) {
    return
  }

  const { data } = await query.graph({
    entity: "promotion",
    fields: ["id", "is_automatic"],
    filters: { id: promotionIds },
  })

  const promotions = z
    .array(z.object({ id: z.string(), is_automatic: z.boolean().nullish() }))
    .parse(data)

  if (promotions.some((promotion) => promotion.is_automatic)) {
    throw automaticPromotionError()
  }
}
