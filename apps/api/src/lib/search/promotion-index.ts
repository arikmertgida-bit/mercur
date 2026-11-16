import type { Query } from '@medusajs/framework'
import { ICacheService, MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { type GraphList, presentItems } from "../graph-list"

// The three vendor promotion templates (see
// packages/vendor/src/pages/promotions/create/create-promotion-form/templates.ts)
// that target specific products. `amount_off_order`, `percentage_off_order`
// and `shipping_discount` apply to the whole cart/shipping method, not to
// individual products, so a product can never be "covered" by them and they
// never appear here.
export type ProductPromotionKind =
  | 'amount_off_products'
  | 'percentage_off_product'
  | 'buy_get'

export type ProductTargetRuleAttribute =
  | 'product_id'
  | 'category_id'
  | 'collection_id'
  | 'type_id'
  | 'tag_id'

export type ProductTargetRule = {
  attribute: ProductTargetRuleAttribute
  values: string[]
}

export type IndexedProductPromotion = {
  promotionId: string
  sellerId: string | null
  campaignId: string | null
  // ISO strings, not Dates: the loaded list round-trips through the Redis
  // cache, which would turn a Date into a string anyway.
  campaignStartsAt: string | null
  campaignEndsAt: string | null
  kind: ProductPromotionKind
  // Every rule must match (AND) for a product to be considered covered —
  // mirrors how Medusa evaluates a promotion's own target rules against
  // cart line items. An empty array means the promotion has no product
  // restriction (matches everything), which is valid native behaviour.
  rules: ProductTargetRule[]
}

export type PromotionMatchableProduct = {
  id: string
  category_ids: string[]
  collection_id: string | null
  type_id: string | null
  tag_ids: string[]
}

type TargetRuleRow = {
  attribute?: string | null
  operator?: string | null
  values?: GraphList<{ value?: string | null }>
}

type PromotionRow = {
  id: string
  status?: string | null
  type?: string | null
  campaign_id?: string | null
  campaign?: {
    starts_at?: string | Date | null
    ends_at?: string | Date | null
  } | null
  application_method?: {
    type?: string | null
    target_type?: string | null
    target_rules?: GraphList<TargetRuleRow>
  } | null
}

// The rule-attribute values the vendor promotion builder can actually
// produce (see rule-attributes-map.ts's `itemsAttributes`) — mapped to the
// facet a product already carries at index time.
const RULE_ATTRIBUTE_MAP: Record<string, ProductTargetRuleAttribute> = {
  'items.product.id': 'product_id',
  'items.product.categories.id': 'category_id',
  'items.product.collection_id': 'collection_id',
  'items.product.type_id': 'type_id',
  'items.product.tags.id': 'tag_id',
}

// Vendor promotion forms only ever produce multiselect "in" rules (see
// rule-attributes-map.ts — every items-target attribute is `field_type:
// "multiselect"`). A rule using any other operator can't be resolved into a
// concrete target-product set without re-running Medusa's full cart-time
// rule engine — deliberately unsupported here. Such a promotion still works
// correctly at checkout; it simply doesn't surface in search facets.
const RESOLVABLE_OPERATORS = new Set(['in', 'eq'])

function classifyPromotionKind(promotion: PromotionRow): ProductPromotionKind | null {
  if (promotion.type === 'buyget') {
    return 'buy_get'
  }

  const method = promotion.application_method
  if (!method || method.target_type !== 'items') {
    return null
  }
  if (method.type === 'fixed') {
    return 'amount_off_products'
  }
  if (method.type === 'percentage') {
    return 'percentage_off_product'
  }
  return null
}

export type CampaignPhase = 'active' | 'upcoming'

export function isInCampaignPhase(
  campaign: PromotionRow['campaign'],
  phase: CampaignPhase,
  now: number
): boolean {
  const startsAt = campaign?.starts_at ? new Date(campaign.starts_at).getTime() : null
  const endsAt = campaign?.ends_at ? new Date(campaign.ends_at).getTime() : null
  if (endsAt !== null && endsAt < now) {
    return false
  }
  if (phase === 'upcoming') {
    return startsAt !== null && startsAt > now
  }
  return startsAt === null || startsAt <= now
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null
  }
  return new Date(value).toISOString()
}

// Returns null (not resolvable) rather than a partial rule set — a
// promotion whose rules can't be fully understood must never be
// under-matched (falsely shown as "on sale" for products it doesn't
// actually cover) or over-matched, so it is excluded entirely.
function resolveTargetRules(
  rows: GraphList<TargetRuleRow> | undefined
): ProductTargetRule[] | null {
  const rules: ProductTargetRule[] = []
  for (const row of rows ?? []) {
    if (!row?.attribute || !row.operator) {
      return null
    }
    const attribute = RULE_ATTRIBUTE_MAP[row.attribute]
    if (!attribute || !RESOLVABLE_OPERATORS.has(row.operator)) {
      return null
    }
    const values = presentItems(row.values)
      .map((value) => value.value)
      .filter((value): value is string => Boolean(value))
    if (!values.length) {
      return null
    }
    rules.push({ attribute, values })
  }
  return rules
}

const CACHE_KEY_BY_PHASE: Record<CampaignPhase, string> = {
  active: 'search:product-promotions:active',
  upcoming: 'search:product-promotions:upcoming',
}
const CACHE_TTL_SECONDS = 60

// Loaded fresh on every reindex call (product.created/updated, the stock
// job) but cached briefly — promotions change far less often than products,
// so this bounds query volume without meaningfully delaying visibility of a
// new/edited promotion.
export async function loadActiveProductPromotions(
  container: MedusaContainer
): Promise<IndexedProductPromotion[]> {
  return loadProductPromotions(container, 'active')
}

// Promotions of campaigns whose starts_at is still ahead. Medusa applies
// none of them yet; they only let the storefront list a seller's planned
// campaign products (at their current price) before the campaign starts.
// A promotion without a campaign has no start date and is never upcoming.
export async function loadUpcomingProductPromotions(
  container: MedusaContainer
): Promise<IndexedProductPromotion[]> {
  return loadProductPromotions(container, 'upcoming')
}

async function loadProductPromotions(
  container: MedusaContainer,
  phase: CampaignPhase
): Promise<IndexedProductPromotion[]> {
  const cacheKey = CACHE_KEY_BY_PHASE[phase]
  const cache = container.resolve<ICacheService>(Modules.CACHE)
  const cached = await cache.get<IndexedProductPromotion[]>(cacheKey)
  if (cached) {
    return cached
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: promotions } = await query.graph({
    entity: 'promotion',
    fields: [
      'id',
      'status',
      'type',
      'campaign_id',
      'campaign.starts_at',
      'campaign.ends_at',
      'application_method.type',
      'application_method.target_type',
      'application_method.target_rules.attribute',
      'application_method.target_rules.operator',
      'application_method.target_rules.values.value',
    ],
    filters: { status: 'active' },
  })

  const now = Date.now()
  const candidates: { promotion: PromotionRow; kind: ProductPromotionKind; rules: ProductTargetRule[] }[] = []

  for (const promotion of promotions) {
    const kind = classifyPromotionKind(promotion)
    if (!kind || !isInCampaignPhase(promotion.campaign, phase, now)) {
      continue
    }
    const rules = resolveTargetRules(promotion.application_method?.target_rules)
    if (rules === null) {
      continue
    }
    candidates.push({ promotion, kind, rules })
  }

  const promotionIds = candidates.map((c) => c.promotion.id)
  const sellerByPromotionId = new Map<string, string>()
  if (promotionIds.length) {
    const { data: sellerLinks } = await query.graph({
      entity: 'promotion_seller',
      fields: ['promotion_id', 'seller_id'],
      filters: { promotion_id: promotionIds },
    })
    for (const link of sellerLinks) {
      sellerByPromotionId.set(link.promotion_id, link.seller_id)
    }
  }

  const resolved: IndexedProductPromotion[] = candidates.map(({ promotion, kind, rules }) => ({
    promotionId: promotion.id,
    sellerId: sellerByPromotionId.get(promotion.id) ?? null,
    campaignId: promotion.campaign_id ?? null,
    campaignStartsAt: toIsoString(promotion.campaign?.starts_at),
    campaignEndsAt: toIsoString(promotion.campaign?.ends_at),
    kind,
    rules,
  }))

  await cache.set(cacheKey, resolved, CACHE_TTL_SECONDS)
  return resolved
}

function ruleMatches(rule: ProductTargetRule, product: PromotionMatchableProduct): boolean {
  switch (rule.attribute) {
    case 'product_id':
      return rule.values.includes(product.id)
    case 'category_id':
      return product.category_ids.some((id) => rule.values.includes(id))
    case 'collection_id':
      return product.collection_id !== null && rule.values.includes(product.collection_id)
    case 'type_id':
      return product.type_id !== null && rule.values.includes(product.type_id)
    case 'tag_id':
      return product.tag_ids.some((id) => rule.values.includes(id))
  }
}

// Same rule-matching as matchProductPromotions but returns the matched
// promotions' own ids instead of aggregated kinds — for callers (the
// per-product promotions route) that need each promotion's own display
// fields (discount value, code, campaign name), not just facet counts.
export function matchProductPromotionIds(
  product: PromotionMatchableProduct,
  activePromotions: IndexedProductPromotion[]
): string[] {
  return activePromotions
    .filter((promotion) => promotion.rules.every((rule) => ruleMatches(rule, product)))
    .map((promotion) => promotion.promotionId)
}

export function matchProductPromotions(
  product: PromotionMatchableProduct,
  activePromotions: IndexedProductPromotion[]
): { promotion_types: ProductPromotionKind[]; campaign_ids: string[] } {
  const kinds = new Set<ProductPromotionKind>()
  const campaignIds = new Set<string>()

  for (const promotion of activePromotions) {
    const matchesAllRules = promotion.rules.every((rule) => ruleMatches(rule, product))
    if (!matchesAllRules) {
      continue
    }
    kinds.add(promotion.kind)
    if (promotion.campaignId) {
      campaignIds.add(promotion.campaignId)
    }
  }

  return {
    promotion_types: [...kinds],
    campaign_ids: [...campaignIds],
  }
}

export function matchCampaignIds(
  product: PromotionMatchableProduct,
  promotions: IndexedProductPromotion[]
): string[] {
  const campaignIds = new Set<string>()
  for (const promotion of promotions) {
    if (promotion.campaignId && promotion.rules.every((rule) => ruleMatches(rule, product))) {
      campaignIds.add(promotion.campaignId)
    }
  }
  return [...campaignIds]
}

export type CampaignWindow = {
  campaign_id: string
  starts_at: string | null
  ends_at: string | null
}

function timeOrInfinity(value: string | null): number {
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY
}

// The one campaign a product card counts down to: the soonest-ending
// running campaign, or the soonest-starting planned one.
export function pickCampaignWindow(
  product: PromotionMatchableProduct,
  promotions: IndexedProductPromotion[],
  phase: CampaignPhase
): CampaignWindow | null {
  let best: CampaignWindow | null = null
  for (const promotion of promotions) {
    if (!promotion.campaignId || !promotion.rules.every((rule) => ruleMatches(rule, product))) {
      continue
    }
    const candidate: CampaignWindow = {
      campaign_id: promotion.campaignId,
      starts_at: promotion.campaignStartsAt,
      ends_at: promotion.campaignEndsAt,
    }
    const key = phase === 'upcoming' ? 'starts_at' : 'ends_at'
    if (!best || timeOrInfinity(candidate[key]) < timeOrInfinity(best[key])) {
      best = candidate
    }
  }
  return best
}
