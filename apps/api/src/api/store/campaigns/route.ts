import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isSellerVisible } from "@mercurjs/core/api/utils/sellers"

import { computeCampaignStatus, CampaignComputedStatus } from "../../../lib/campaign-status"
import { getCampaignIdsForCategory } from "../../../lib/search/meilisearch-client"
import { StoreGetCampaignsParamsType } from "./validators"

type PromotionTargetRuleRow = {
  attribute?: string | null
  operator?: string | null
  values?: { value?: string | null }[] | null
}

type PromotionRow = {
  campaign_id?: string | null
  application_method?: {
    target_type?: string | null
    target_rules?: PromotionTargetRuleRow[] | null
  } | null
}

const RESOLVABLE_OPERATORS = new Set(["in", "eq"])

// A scheduled campaign's products are intentionally not revealed before it
// starts (see storefront campaigns/upcoming/[id] — "productsRevealOnStart"),
// so unlike active campaigns this can't resolve category coverage through
// the product catalog/search index. It can only see what a promotion's own
// target rules directly say — a category-targeting rule, not a
// product/collection/tag/type rule that would require looking up (and
// thereby prematurely revealing) the actual target products. Matches the
// same "don't guess, exclude rather than over/under-match" principle as
// resolveTargetRules in promotion-index.ts.
async function resolveCampaignIdsByDirectCategoryRule(
  query: Query,
  campaignIds: string[],
  categoryId: string
): Promise<Set<string>> {
  if (!campaignIds.length) {
    return new Set()
  }

  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: [
      "campaign_id",
      "application_method.target_type",
      "application_method.target_rules.attribute",
      "application_method.target_rules.operator",
      "application_method.target_rules.values.value",
    ],
    filters: { campaign_id: campaignIds },
  })

  const matched = new Set<string>()
  for (const promotion of promotions as PromotionRow[]) {
    if (!promotion.campaign_id || promotion.application_method?.target_type !== "items") {
      continue
    }
    const rules = promotion.application_method?.target_rules ?? []
    const hasMatch = rules.some(
      (rule) =>
        rule.attribute === "items.product.categories.id" &&
        rule.operator &&
        RESOLVABLE_OPERATORS.has(rule.operator) &&
        (rule.values ?? []).some((value) => value.value === categoryId)
    )
    if (hasMatch) {
      matched.add(promotion.campaign_id)
    }
  }
  return matched
}

type CampaignBudgetRow = {
  id: string
  type: string
  limit: number | null
  used: number
  currency_code: string | null
}

type CampaignSellerRow = {
  id: string
  status: string
  closed_from: string | null
  closed_to: string | null
}

type CampaignRow = {
  id: string
  name: string
  description: string | null
  campaign_identifier: string
  starts_at: string | null
  ends_at: string | null
  budget: CampaignBudgetRow | null
  seller: CampaignSellerRow | null
}

export const GET = async (
  req: MedusaRequest<never, StoreGetCampaignsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { status, limit, offset, category_id } = req.validatedQuery

  const { data: campaigns } = await query.graph({
    entity: "campaign",
    fields: [
      "id",
      "name",
      "description",
      "campaign_identifier",
      "starts_at",
      "ends_at",
      "budget.*",
      "seller.id",
      "seller.status",
      "seller.closed_from",
      "seller.closed_to",
    ],
  })

  const wantedStatus: CampaignComputedStatus = status === "upcoming" ? "scheduled" : "active"
  const now = new Date()

  const rows = campaigns as CampaignRow[]

  const statusFiltered = rows.filter((campaign) => {
    if (campaign.seller && !isSellerVisible(campaign.seller, now)) {
      return false
    }
    return computeCampaignStatus(campaign) === wantedStatus
  })

  let categoryCampaignIds: Set<string> | null = null
  if (category_id) {
    categoryCampaignIds =
      wantedStatus === "active"
        ? new Set(await getCampaignIdsForCategory(category_id))
        : await resolveCampaignIdsByDirectCategoryRule(
            query,
            statusFiltered.map((campaign) => campaign.id),
            category_id
          )
  }

  const visible = categoryCampaignIds
    ? statusFiltered.filter((campaign) => categoryCampaignIds.has(campaign.id))
    : statusFiltered

  const sorted = [...visible].sort((a, b) => {
    if (wantedStatus === "scheduled") {
      const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0
      const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0
      return aStart - bStart
    }
    const aEnd = a.ends_at ? new Date(a.ends_at).getTime() : Number.MAX_SAFE_INTEGER
    const bEnd = b.ends_at ? new Date(b.ends_at).getTime() : Number.MAX_SAFE_INTEGER
    return aEnd - bEnd
  })

  const paged = sorted.slice(offset, offset + limit)

  res.json({
    campaigns: paged.map(({ seller: _seller, ...rest }) => rest),
    count: visible.length,
    limit,
    offset,
  })
}
