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
  // When the discount began: the campaign start, else the promotion's own
  // creation. Anchors the 10-day reference-price window (see reference-price.ts).
  discountStartsAt: string | null
  kind: ProductPromotionKind
  // Every rule must match (AND) for a product to be considered covered —
  // mirrors how Medusa evaluates a promotion's own target rules against
  // cart line items. An empty array means the promotion has no product
  // restriction (matches everything), which is valid native behaviour.
  rules: ProductTargetRule[]
  // Buy-get only: the rules the bought items must match (same AND
  // semantics). null when they cannot be resolved — the product then never
  // gets an "X Al Y Öde" label, since buying it might not unlock the deal.
  buyRules: ProductTargetRule[] | null
}

// A promotion discounting the whole order or its shipping instead of chosen
// products: it covers every product in its seller scope (see
// promotionsInSellerScope). Only the campaign labels use it.
export type CartWidePromotion = {
  promotionId: string
  sellerId: string | null
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
  created_at?: string | Date | null
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
    buy_rules?: GraphList<TargetRuleRow>
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

// "v2": entries carry buyRules; the suffix keeps a just-deployed backend from
// reading a list cached before the field existed.
const CACHE_KEY_BY_PHASE: Record<CampaignPhase, string> = {
  active: 'search:product-promotions:active:v2',
  upcoming: 'search:product-promotions:upcoming:v2',
}
const CART_WIDE_CACHE_KEY = 'search:cart-wide-promotions:active'
// Every list cached here; a test clears them to see a promotion it just made.
export const PROMOTION_CACHE_KEYS = [...Object.values(CACHE_KEY_BY_PHASE), CART_WIDE_CACHE_KEY]
const CACHE_TTL_SECONDS = 60
const CART_WIDE_TARGET_TYPES = ['order', 'shipping_methods']

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
      'created_at',
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
      'application_method.buy_rules.attribute',
      'application_method.buy_rules.operator',
      'application_method.buy_rules.values.value',
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

  const sellerByPromotionId = await loadPromotionSellerIds(
    query,
    candidates.map((c) => c.promotion.id)
  )

  const resolved: IndexedProductPromotion[] = candidates.map(({ promotion, kind, rules }) => ({
    promotionId: promotion.id,
    sellerId: sellerByPromotionId.get(promotion.id) ?? null,
    campaignId: promotion.campaign_id ?? null,
    campaignStartsAt: toIsoString(promotion.campaign?.starts_at),
    campaignEndsAt: toIsoString(promotion.campaign?.ends_at),
    discountStartsAt: toIsoString(promotion.campaign?.starts_at ?? promotion.created_at),
    kind,
    rules,
    buyRules:
      kind === 'buy_get' ? resolveTargetRules(promotion.application_method?.buy_rules) : [],
  }))

  await cache.set(cacheKey, resolved, CACHE_TTL_SECONDS)
  return resolved
}

async function loadPromotionSellerIds(
  query: Query,
  promotionIds: string[]
): Promise<Map<string, string>> {
  const sellerByPromotionId = new Map<string, string>()
  if (!promotionIds.length) {
    return sellerByPromotionId
  }
  const { data: sellerLinks } = await query.graph({
    entity: 'promotion_seller',
    fields: ['promotion_id', 'seller_id'],
    filters: { promotion_id: promotionIds },
  })
  for (const link of sellerLinks) {
    sellerByPromotionId.set(link.promotion_id, link.seller_id)
  }
  return sellerByPromotionId
}

// Running order/shipping promotions. One with target rules (shipping option
// types) covers only some shipping methods and is left out: a label must hold
// for whatever shipping the shopper picks.
export async function loadCartWidePromotions(
  container: MedusaContainer
): Promise<CartWidePromotion[]> {
  const cache = container.resolve<ICacheService>(Modules.CACHE)
  const cached = await cache.get<CartWidePromotion[]>(CART_WIDE_CACHE_KEY)
  if (cached) {
    return cached
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: promotions } = await query.graph({
    entity: 'promotion',
    fields: [
      'id',
      'campaign.starts_at',
      'campaign.ends_at',
      'application_method.target_type',
      'application_method.target_rules.id',
    ],
    filters: { status: 'active' },
  })

  const now = Date.now()
  const promotionIds = promotions
    .filter(
      (promotion) =>
        CART_WIDE_TARGET_TYPES.includes(promotion.application_method?.target_type ?? '') &&
        presentItems(promotion.application_method?.target_rules).length === 0 &&
        isInCampaignPhase(promotion.campaign, 'active', now)
    )
    .map((promotion) => promotion.id)
  const sellerByPromotionId = await loadPromotionSellerIds(query, promotionIds)
  const resolved: CartWidePromotion[] = promotionIds.map((promotionId) => ({
    promotionId,
    sellerId: sellerByPromotionId.get(promotionId) ?? null,
  }))

  await cache.set(CART_WIDE_CACHE_KEY, resolved, CACHE_TTL_SECONDS)
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

/**
 * The promotions that can discount a product of the given seller: platform
 * promotions (no seller) and that seller's own. Mirrors the cart-side scope
 * (`isAdjustmentInSellerScope` in @mercurjs/core), so the index never marks a
 * product with a campaign the cart would not apply to it.
 */
export function promotionsInSellerScope<T extends { sellerId: string | null }>(
  promotions: T[],
  sellerId: string | null | undefined
): T[] {
  return promotions.filter((promotion) => !promotion.sellerId || promotion.sellerId === sellerId)
}

// The matched buy-get promotions whose buy rules the product itself meets, so
// buying more of it alone unlocks the deal ("3 Al 2 Öde" on its card).
export function matchBuyRulePromotionIds(
  product: PromotionMatchableProduct,
  promotions: IndexedProductPromotion[]
): Set<string> {
  return new Set(
    promotions
      .filter(
        (promotion) =>
          promotion.kind === 'buy_get' &&
          promotion.buyRules !== null &&
          promotion.buyRules.every((rule) => ruleMatches(rule, product)) &&
          promotion.rules.every((rule) => ruleMatches(rule, product))
      )
      .map((promotion) => promotion.promotionId)
  )
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

// The earliest start among the promotions discounting a product: the
// reference price must come from before the discount began, not from the
// discount's own (possibly raised) days.
export function earliestDiscountStart(
  promotionIds: string[],
  promotions: IndexedProductPromotion[]
): string | null {
  let earliest: string | null = null
  for (const promotion of promotions) {
    const startsAt = promotion.discountStartsAt ?? null
    if (!startsAt || !promotionIds.includes(promotion.promotionId)) {
      continue
    }
    if (!earliest || new Date(startsAt).getTime() < new Date(earliest).getTime()) {
      earliest = startsAt
    }
  }
  return earliest
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
