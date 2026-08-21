import type { Query } from '@medusajs/framework'
import { z } from 'zod'

import { parseRows } from '../graph-schemas'

const PromotionDetailRowSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  type: z.string(),
  status: z.string(),
  is_automatic: z.boolean(),
  application_method: z
    .object({
      type: z.string().nullable().optional(),
      // Coerced defensively: a `numeric`/`decimal` DB column can come back
      // as a string from the ORM layer (precision safety) — see the same
      // gotcha documented in reference-price.ts's SnapshotRowSchema.
      value: z.coerce.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  campaign: z
    .object({
      name: z.string(),
      starts_at: z.union([z.string(), z.date()]).nullable().optional(),
      ends_at: z.union([z.string(), z.date()]).nullable().optional(),
      budget: z
        .object({
          limit: z.coerce.number().nullable().optional(),
          used: z.coerce.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
})

export type PromotionDetail = {
  id: string
  display_code: string
  type: string
  status: string
  is_automatic: boolean
  discount_type: string | null
  discount_value: number
  scope: 'seller' | 'platform'
  campaign: {
    name: string
    starts_at: string | Date | null
    ends_at: string | Date | null
    budget_remaining_pct: number | null
  } | null
}

type CampaignBudget = { limit?: number | null; used?: number | null } | null | undefined

function computeBudgetRemainingPct(budget: CampaignBudget): number | null {
  const limit = budget?.limit
  const used = budget?.used ?? 0
  if (typeof limit !== 'number' || limit <= 0) {
    return null
  }
  const remaining = ((limit - used) / limit) * 100
  return Math.min(100, Math.max(0, remaining))
}

// Loads the display-ready fields (code, discount value, campaign/budget) for
// a batch of promotion ids in a single `query.graph` call — shared by the
// per-product promotions route and the catalog/seller-catalog listing routes
// so neither one re-implements the same field list / row parsing.
export async function loadPromotionDetails(
  query: Query,
  promotionIds: string[],
  sellerIdByPromotionId: Map<string, string | null>
): Promise<PromotionDetail[]> {
  if (promotionIds.length === 0) {
    return []
  }

  const { data: promotionRows } = await query.graph({
    entity: 'promotion',
    fields: [
      'id',
      'code',
      'type',
      'status',
      'is_automatic',
      'application_method.type',
      'application_method.value',
      'campaign.name',
      'campaign.starts_at',
      'campaign.ends_at',
      'campaign.budget.limit',
      'campaign.budget.used',
    ],
    filters: { id: promotionIds },
  })

  return parseRows(PromotionDetailRowSchema, promotionRows as object[]).map((promotion) => ({
    id: promotion.id,
    display_code: promotion.code ?? promotion.campaign?.name ?? promotion.id,
    type: promotion.type,
    status: promotion.status,
    is_automatic: promotion.is_automatic,
    discount_type: promotion.application_method?.type ?? null,
    discount_value: promotion.application_method?.value ?? 0,
    scope: sellerIdByPromotionId.get(promotion.id) ? 'seller' : 'platform',
    campaign: promotion.campaign
      ? {
          name: promotion.campaign.name,
          starts_at: promotion.campaign.starts_at ?? null,
          ends_at: promotion.campaign.ends_at ?? null,
          budget_remaining_pct: computeBudgetRemainingPct(promotion.campaign.budget),
        }
      : null,
  }))
}
