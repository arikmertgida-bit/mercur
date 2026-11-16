import type { Query } from '@medusajs/framework'
import { z } from 'zod'

import { parseRows } from '../graph-schemas'
import {
  buildCartDiscount,
  type CartDiscount,
  type CartDiscountContext,
  type CartPromotionFacts,
} from './cart-discount'

const PromotionDetailRowSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  type: z.string(),
  status: z.string(),
  is_automatic: z.boolean(),
  limit: z.coerce.number().nullable().optional(),
  used: z.coerce.number().nullable().optional(),
  rules: z.array(z.object({ id: z.string() }).nullable()).nullable().optional(),
  application_method: z
    .object({
      type: z.string().nullable().optional(),
      target_type: z.string().nullable().optional(),
      currency_code: z.string().nullable().optional(),
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
          type: z.string().nullable().optional(),
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
  // Set only on the promotion a listing/PDP shows for a product: the
  // product's whole in-cart discount (see cart-discount.ts).
  cart_discount: CartDiscount | null
}

export type LoadedPromotion = {
  detail: PromotionDetail
  facts: CartPromotionFacts
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

// Loads the display-ready fields (code, discount value, campaign/budget) and
// the facts deciding whether the cart applies the promotion, for a batch of
// promotion ids in a single `query.graph` call — shared by the per-product
// promotions route and the catalog/seller-catalog listing routes.
export async function loadPromotionDetails(
  query: Query,
  promotionIds: string[],
  sellerIdByPromotionId: Map<string, string | null>
): Promise<LoadedPromotion[]> {
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
      'limit',
      'used',
      'rules.id',
      'application_method.type',
      'application_method.target_type',
      'application_method.currency_code',
      'application_method.value',
      'campaign.name',
      'campaign.starts_at',
      'campaign.ends_at',
      'campaign.budget.type',
      'campaign.budget.limit',
      'campaign.budget.used',
    ],
    filters: { id: promotionIds },
  })

  return parseRows(PromotionDetailRowSchema, promotionRows).map((promotion) => {
    const method = promotion.application_method
    const campaign = promotion.campaign
    return {
      detail: {
        id: promotion.id,
        display_code: promotion.code ?? campaign?.name ?? promotion.id,
        type: promotion.type,
        status: promotion.status,
        is_automatic: promotion.is_automatic,
        discount_type: method?.type ?? null,
        discount_value: method?.value ?? 0,
        scope: sellerIdByPromotionId.get(promotion.id) ? 'seller' : 'platform',
        campaign: campaign
          ? {
              name: campaign.name,
              starts_at: campaign.starts_at ?? null,
              ends_at: campaign.ends_at ?? null,
              budget_remaining_pct: computeBudgetRemainingPct(campaign.budget),
            }
          : null,
        cart_discount: null,
      },
      facts: {
        id: promotion.id,
        status: promotion.status,
        type: promotion.type,
        is_automatic: promotion.is_automatic,
        rule_count: (promotion.rules ?? []).filter((rule) => rule !== null).length,
        limit: promotion.limit ?? null,
        used: promotion.used ?? 0,
        method: method
          ? {
              type: method.type ?? null,
              target_type: method.target_type ?? null,
              value: method.value ?? 0,
              currency_code: method.currency_code ?? null,
            }
          : null,
        campaign: campaign
          ? {
              starts_at: campaign.starts_at ?? null,
              ends_at: campaign.ends_at ?? null,
              budget: campaign.budget
                ? {
                    type: campaign.budget.type ?? null,
                    limit: campaign.budget.limit ?? null,
                    used: campaign.budget.used ?? 0,
                  }
                : null,
            }
          : null,
      },
    }
  })
}

// The promotions matched to one product, the one the cart applies first
// leading (so a card's strip/budget bar describe the discount the cart
// gives) and carrying the product's combined `cart_discount`.
export function presentProductPromotions(
  matched: LoadedPromotion[],
  context: CartDiscountContext
): PromotionDetail[] {
  const cart = buildCartDiscount(
    matched.map((promotion) => promotion.facts),
    context
  )
  if (!cart) {
    return matched.map((promotion) => promotion.detail)
  }
  const leadId = cart.promotionIds[0]
  const lead = matched.find((promotion) => promotion.detail.id === leadId)
  if (!lead) {
    return matched.map((promotion) => promotion.detail)
  }
  return [
    { ...lead.detail, cart_discount: cart.discount },
    ...matched
      .filter((promotion) => promotion.detail.id !== leadId)
      .map((promotion) => promotion.detail),
  ]
}
