// What a product page/card may claim as "Sepette %X indirim": the item
// promotions Medusa's `computeActions` will really apply to one unit of the
// product in a cart, in the order it applies them. Anything that cannot be
// verified without the shopper's cart (customer group or other promotion
// rules, coupon codes, buy-get) is left out, so the label can only ever
// understate the cart discount, never overstate it.

export const CART_DISCOUNT_STEP_TYPES = ['percentage', 'fixed'] as const
export type CartDiscountStepType = (typeof CART_DISCOUNT_STEP_TYPES)[number]

const PROMOTION_STATUS_ACTIVE = 'active'
const PROMOTION_TYPE_STANDARD = 'standard'
const TARGET_TYPE_ITEMS = 'items'
const BUDGET_TYPE_SPEND = 'spend'
const BUDGET_TYPE_USAGE = 'usage'

export type CartPromotionFacts = {
  id: string
  status: string
  type: string
  is_automatic: boolean
  // Promotion-level rules (customer group, region, …) depend on the cart.
  rule_count: number
  limit: number | null
  used: number
  method: {
    type: string | null
    target_type: string | null
    value: number
    currency_code: string | null
    buy_rules_min_quantity: number | null
    apply_to_quantity: number | null
  } | null
  campaign: {
    starts_at: string | Date | null
    ends_at: string | Date | null
    budget: {
      type: string | null
      limit: number | null
      used: number
    } | null
  } | null
}

export type CartDiscountStep = {
  type: CartDiscountStepType
  value: number
  // Left in a spend budget (in the promotion's currency); a step whose
  // amount for the shown price exceeds it is not applied by Medusa.
  budget_remaining: number | null
}

export type CartDiscount = {
  currency_code: string | null
  steps: CartDiscountStep[]
}

export type CartDiscountContext = {
  currency_code: string | null
  product_discountable: boolean
  now: number
}

function toTime(value: string | Date | null): number | null {
  return value ? new Date(value).getTime() : null
}

function isCampaignRunning(campaign: CartPromotionFacts['campaign'], now: number): boolean {
  if (!campaign) {
    return true
  }
  const startsAt = toTime(campaign.starts_at)
  const endsAt = toTime(campaign.ends_at)
  return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt > now)
}

function toStepType(methodType: string | null): CartDiscountStepType | null {
  return CART_DISCOUNT_STEP_TYPES.find((type) => type === methodType) ?? null
}

function spendBudgetRemaining(facts: CartPromotionFacts): number | null | false {
  const budget = facts.campaign?.budget
  if (!budget || !budget.limit) {
    return null
  }
  if (budget.type === BUDGET_TYPE_SPEND) {
    const remaining = budget.limit - budget.used
    return remaining > 0 ? remaining : false
  }
  if (budget.type === BUDGET_TYPE_USAGE) {
    return budget.used + 1 > budget.limit ? false : null
  }
  return null
}

// Whether the cart can apply the promotion to anyone right now: published,
// inside its campaign window, usage limit and budget not spent, and no
// promotion-level rule (customer group, region, …) that depends on the cart.
export function isPromotionOpenToEveryone(facts: CartPromotionFacts, now: number): boolean {
  return (
    facts.status === PROMOTION_STATUS_ACTIVE &&
    facts.rule_count === 0 &&
    isCampaignRunning(facts.campaign, now) &&
    (facts.limit === null || facts.used < facts.limit) &&
    spendBudgetRemaining(facts) !== false
  )
}

// A fixed amount is in one currency: it only means something to a shopper
// paying in it.
export function toMoneyStepType(
  method: NonNullable<CartPromotionFacts['method']>,
  currencyCode: string | null
): CartDiscountStepType | null {
  const type = toStepType(method.type)
  if (!type || method.value <= 0) {
    return null
  }
  if (method.currency_code && method.currency_code !== currencyCode) {
    return null
  }
  if (type === 'fixed' && !currencyCode) {
    return null
  }
  return type
}

export function toCartDiscountStep(
  facts: CartPromotionFacts,
  context: Pick<CartDiscountContext, 'currency_code' | 'now'>
): CartDiscountStep | null {
  const method = facts.method
  if (
    facts.type !== PROMOTION_TYPE_STANDARD ||
    !facts.is_automatic ||
    !method ||
    method.target_type !== TARGET_TYPE_ITEMS ||
    !isPromotionOpenToEveryone(facts, context.now)
  ) {
    return null
  }
  const type = toMoneyStepType(method, context.currency_code)
  if (!type) {
    return null
  }
  const budgetRemaining = spendBudgetRemaining(facts)
  return {
    type,
    value: method.value,
    budget_remaining: budgetRemaining === false ? null : budgetRemaining,
  }
}

// Medusa lists the candidate promotions ordered by application_method.value
// DESC and applies every one of them in turn, each on what the previous ones
// left of the item. The id tie-break only makes equal values deterministic.
export function buildCartDiscount(
  promotions: CartPromotionFacts[],
  context: CartDiscountContext
): { discount: CartDiscount; promotionIds: string[] } | null {
  if (!context.product_discountable) {
    return null
  }
  const applied = promotions
    .map((facts) => ({ facts, step: toCartDiscountStep(facts, context) }))
    .filter(
      (entry): entry is { facts: CartPromotionFacts; step: CartDiscountStep } => entry.step !== null
    )
    .sort((a, b) => b.step.value - a.step.value || a.facts.id.localeCompare(b.facts.id))
  if (!applied.length) {
    return null
  }
  return {
    discount: {
      currency_code: context.currency_code,
      steps: applied.map((entry) => entry.step),
    },
    promotionIds: applied.map((entry) => entry.facts.id),
  }
}
