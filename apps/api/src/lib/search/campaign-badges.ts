// The campaign labels a product card/page may show next to "Sepette %X
// indirim" (cart-discount.ts). Each one only names the condition the cart
// checks ("İndirim Kodu", "3 Al 2 Öde", "Siparişe %10 indirim", "Kargo
// Bedava"), never a discounted price, and only for a promotion the cart
// gives to anyone buying the product — the same rule as the cart label.

import {
  type CartDiscountStepType,
  type CartPromotionFacts,
  isPromotionOpenToEveryone,
  toMoneyStepType,
} from './cart-discount'

export type CampaignBadge =
  | { type: 'free_shipping' }
  | { type: 'buy_get'; buy: number; pay: number }
  | {
      type: 'order_discount'
      discount_type: CartDiscountStepType
      value: number
      currency_code: string | null
    }
  | { type: 'code' }

export type CampaignBadgeType = CampaignBadge['type']

export type CampaignBadgeContext = {
  currency_code: string | null
  product_discountable: boolean
  now: number
  // Buy-get promotions whose buy rules the product itself meets.
  buy_rule_matches: ReadonlySet<string>
}

const PROMOTION_TYPE_STANDARD = 'standard'
const PROMOTION_TYPE_BUYGET = 'buyget'
const TARGET_TYPE_ORDER = 'order'
const TARGET_TYPE_SHIPPING = 'shipping_methods'
const METHOD_TYPE_PERCENTAGE = 'percentage'
const FULL_PERCENTAGE = 100

const BADGE_ORDER: CampaignBadgeType[] = ['free_shipping', 'buy_get', 'order_discount', 'code']

function toAutomaticBadge(
  facts: CartPromotionFacts,
  method: NonNullable<CartPromotionFacts['method']>,
  context: CampaignBadgeContext
): CampaignBadge | null {
  if (facts.type === PROMOTION_TYPE_STANDARD && method.target_type === TARGET_TYPE_SHIPPING) {
    return method.type === METHOD_TYPE_PERCENTAGE && method.value >= FULL_PERCENTAGE
      ? { type: 'free_shipping' }
      : null
  }
  if (!context.product_discountable) {
    return null
  }
  if (facts.type === PROMOTION_TYPE_BUYGET) {
    const pay = method.buy_rules_min_quantity ?? 0
    const free = method.apply_to_quantity ?? 0
    // Only a 100% buy-get makes "N Al M Öde" literally true.
    if (
      method.type !== METHOD_TYPE_PERCENTAGE ||
      method.value < FULL_PERCENTAGE ||
      pay < 1 ||
      free < 1 ||
      !context.buy_rule_matches.has(facts.id)
    ) {
      return null
    }
    return { type: 'buy_get', buy: pay + free, pay }
  }
  if (facts.type === PROMOTION_TYPE_STANDARD && method.target_type === TARGET_TYPE_ORDER) {
    const discountType = toMoneyStepType(method, context.currency_code)
    // A seller's fixed order amount is spread over the whole multi-seller
    // cart before the other sellers' share is dropped, so the shopper can get
    // less than the amount. A percentage is unaffected.
    if (discountType === 'fixed' && facts.seller_scoped) {
      return null
    }
    return discountType
      ? {
          type: 'order_discount',
          discount_type: discountType,
          value: method.value,
          currency_code: discountType === 'fixed' ? context.currency_code : null,
        }
      : null
  }
  return null
}

export function toCampaignBadge(
  facts: CartPromotionFacts,
  context: CampaignBadgeContext
): CampaignBadge | null {
  const method = facts.method
  if (!method || !isPromotionOpenToEveryone(facts, context.now)) {
    return null
  }
  if (!facts.is_automatic) {
    if (method.target_type !== TARGET_TYPE_SHIPPING && !context.product_discountable) {
      return null
    }
    return { type: 'code' }
  }
  return toAutomaticBadge(facts, method, context)
}

function isStronger(candidate: CampaignBadge, current: CampaignBadge): boolean {
  if (candidate.type === 'order_discount' && current.type === 'order_discount') {
    if (candidate.discount_type !== current.discount_type) {
      return candidate.discount_type === 'percentage'
    }
    return candidate.value > current.value
  }
  if (candidate.type === 'buy_get' && current.type === 'buy_get') {
    return candidate.pay / candidate.buy < current.pay / current.buy
  }
  return false
}

// One label per kind, in a fixed order; when several promotions give the
// same kind, the most generous one is named.
export function buildCampaignBadges(
  promotions: CartPromotionFacts[],
  context: CampaignBadgeContext
): CampaignBadge[] {
  const byType = new Map<CampaignBadgeType, CampaignBadge>()
  for (const facts of promotions) {
    const badge = toCampaignBadge(facts, context)
    if (!badge) {
      continue
    }
    const current = byType.get(badge.type)
    if (!current || isStronger(badge, current)) {
      byType.set(badge.type, badge)
    }
  }
  return BADGE_ORDER.flatMap((type) => {
    const badge = byType.get(type)
    return badge ? [badge] : []
  })
}
