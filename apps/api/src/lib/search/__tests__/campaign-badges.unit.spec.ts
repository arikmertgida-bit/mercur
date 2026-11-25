import { buildCampaignBadges, CampaignBadgeContext, toCampaignBadge } from "../campaign-badges"
import { LoadedPromotion, presentProductPromotions } from "../promotion-details"
import { matchBuyRulePromotionIds, type IndexedProductPromotion } from "../promotion-index"
import { facts, FactsOverrides, HOUR, iso, NOW } from "./promotion-facts"

const CONTEXT: CampaignBadgeContext = {
  currency_code: "try",
  product_discountable: true,
  now: NOW,
  buy_rule_matches: new Set(["p_buyget"]),
}

const FREE_SHIPPING = { type: "percentage", target_type: "shipping_methods", value: 100, currency_code: null }
const ORDER_PERCENT = { type: "percentage", target_type: "order", value: 10, currency_code: null }
const ORDER_FIXED = { type: "fixed", target_type: "order", value: 50, currency_code: "try" }
const BUY_2_GET_1 = {
  type: "percentage",
  target_type: "items",
  value: 100,
  currency_code: null,
  buy_rules_min_quantity: 2,
  apply_to_quantity: 1,
}

function badge(overrides: FactsOverrides, context: CampaignBadgeContext = CONTEXT) {
  return toCampaignBadge(facts(overrides), context)
}

describe("toCampaignBadge", () => {
  it("labels a coupon-code promotion of any target as needing a code", () => {
    expect(badge({ id: "p", is_automatic: false })).toEqual({ type: "code" })
    expect(badge({ id: "p", is_automatic: false, method: ORDER_PERCENT })).toEqual({ type: "code" })
    expect(badge({ id: "p", is_automatic: false, method: FREE_SHIPPING })).toEqual({ type: "code" })
  })

  it("labels an automatic buy-get with its own quantities", () => {
    expect(badge({ id: "p_buyget", type: "buyget", method: BUY_2_GET_1 })).toEqual({
      type: "buy_get",
      buy: 3,
      pay: 2,
    })
  })

  it("labels an automatic order percentage and fixed amount", () => {
    expect(badge({ id: "p", method: ORDER_PERCENT })).toEqual({
      type: "order_discount",
      discount_type: "percentage",
      value: 10,
      currency_code: null,
    })
    expect(badge({ id: "p", method: ORDER_FIXED })).toEqual({
      type: "order_discount",
      discount_type: "fixed",
      value: 50,
      currency_code: "try",
    })
  })

  it("labels automatic 100% shipping as free shipping", () => {
    expect(badge({ id: "p", method: FREE_SHIPPING })).toEqual({ type: "free_shipping" })
  })

  it.each([
    ["a draft promotion", { status: "draft" }],
    ["an inactive promotion", { status: "inactive" }],
    ["an ended campaign", { campaign: { starts_at: iso(-2 * HOUR), ends_at: iso(-HOUR), budget: null } }],
    ["a campaign that has not started", { campaign: { starts_at: iso(HOUR), ends_at: iso(2 * HOUR), budget: null } }],
    ["a promotion with cart rules", { rule_count: 1 }],
    ["a promotion past its usage limit", { limit: 3, used: 3 }],
    ["a spent budget", { campaign: { starts_at: null, ends_at: null, budget: { type: "spend", limit: 100, used: 100 } } }],
    ["a used-up usage budget", { campaign: { starts_at: null, ends_at: null, budget: { type: "usage", limit: 2, used: 2 } } }],
  ])("gives no label for %s", (_label, overrides) => {
    expect(badge({ id: "p", is_automatic: false, ...overrides })).toBeNull()
    expect(badge({ id: "p", method: FREE_SHIPPING, ...overrides })).toBeNull()
    expect(badge({ id: "p_buyget", type: "buyget", method: BUY_2_GET_1, ...overrides })).toBeNull()
    expect(badge({ id: "p", method: ORDER_PERCENT, ...overrides })).toBeNull()
  })

  it("leaves automatic item discounts to the cart label", () => {
    expect(badge({ id: "p" })).toBeNull()
  })

  it.each([
    ["a partial buy-get", { ...BUY_2_GET_1, value: 50 }],
    ["a fixed buy-get", { ...BUY_2_GET_1, type: "fixed", currency_code: "try" }],
    ["a buy-get without quantities", { ...BUY_2_GET_1, buy_rules_min_quantity: null }],
  ])("gives no buy-get label for %s", (_label, method) => {
    expect(badge({ id: "p_buyget", type: "buyget", method })).toBeNull()
  })

  it("gives no buy-get label when the product itself does not unlock it", () => {
    expect(badge({ id: "p_other", type: "buyget", method: BUY_2_GET_1 })).toBeNull()
  })

  it("gives no label for a seller's fixed order amount, which a mixed cart shrinks", () => {
    expect(badge({ id: "p", method: ORDER_FIXED, seller_scoped: true })).toBeNull()
    expect(badge({ id: "p", method: ORDER_PERCENT, seller_scoped: true })).toEqual({
      type: "order_discount",
      discount_type: "percentage",
      value: 10,
      currency_code: null,
    })
    expect(badge({ id: "p", is_automatic: false, method: ORDER_FIXED, seller_scoped: true })).toEqual({ type: "code" })
  })

  it("gives no partial shipping or foreign-currency order label", () => {
    expect(badge({ id: "p", method: { ...FREE_SHIPPING, value: 50 } })).toBeNull()
    expect(badge({ id: "p", method: { ...ORDER_FIXED, currency_code: "eur" } })).toBeNull()
    expect(badge({ id: "p", method: ORDER_FIXED }, { ...CONTEXT, currency_code: null })).toBeNull()
  })

  it("gives a non-discountable product only the free-shipping labels", () => {
    const context = { ...CONTEXT, product_discountable: false }
    expect(badge({ id: "p", method: FREE_SHIPPING }, context)).toEqual({ type: "free_shipping" })
    expect(badge({ id: "p", is_automatic: false, method: FREE_SHIPPING }, context)).toEqual({ type: "code" })
    expect(badge({ id: "p", is_automatic: false }, context)).toBeNull()
    expect(badge({ id: "p", method: ORDER_PERCENT }, context)).toBeNull()
    expect(badge({ id: "p_buyget", type: "buyget", method: BUY_2_GET_1 }, context)).toBeNull()
  })
})

describe("buildCampaignBadges", () => {
  it("keeps one label per kind in a fixed order, naming the most generous one", () => {
    const badges = buildCampaignBadges(
      [
        facts({ id: "p_code_1", is_automatic: false }),
        facts({ id: "p_order_fixed", method: ORDER_FIXED }),
        facts({ id: "p_order_5", method: { ...ORDER_PERCENT, value: 5 } }),
        facts({ id: "p_order_15", method: { ...ORDER_PERCENT, value: 15 } }),
        facts({ id: "p_code_2", is_automatic: false, method: ORDER_PERCENT }),
        facts({ id: "p_ship", method: FREE_SHIPPING }),
        facts({ id: "p_auto_item" }),
      ],
      CONTEXT
    )
    expect(badges).toEqual([
      { type: "free_shipping" },
      { type: "order_discount", discount_type: "percentage", value: 15, currency_code: null },
      { type: "code" },
    ])
  })
})

describe("presentProductPromotions with campaign labels", () => {
  function loaded(id: string, overrides: Omit<FactsOverrides, "id"> = {}): LoadedPromotion {
    return {
      detail: {
        id,
        display_code: id,
        type: "standard",
        status: "active",
        is_automatic: true,
        discount_type: "percentage",
        discount_value: 10,
        scope: "seller",
        campaign: null,
        cart_discount: null,
        campaign_badges: [],
      },
      facts: facts({ id, ...overrides }),
    }
  }

  it("puts every label on the item promotion the cart applies first", () => {
    const presented = presentProductPromotions(
      [loaded("p_item")],
      [loaded("p_ship", { method: FREE_SHIPPING }), loaded("p_rules", { method: ORDER_PERCENT, rule_count: 1 })],
      CONTEXT
    )
    expect(presented.map((promotion) => promotion.id)).toEqual(["p_item", "p_ship"])
    expect(presented[0].cart_discount?.steps).toHaveLength(1)
    expect(presented[0].campaign_badges).toEqual([{ type: "free_shipping" }])
    expect(presented[1].campaign_badges).toEqual([])
  })

  it("leads with a labelled order promotion when no product promotion matches", () => {
    const presented = presentProductPromotions([], [loaded("p_order", { method: ORDER_PERCENT })], CONTEXT)
    expect(presented).toHaveLength(1)
    expect(presented[0].cart_discount).toBeNull()
    expect(presented[0].campaign_badges).toEqual([
      { type: "order_discount", discount_type: "percentage", value: 10, currency_code: null },
    ])
  })

  it("adds nothing for order promotions that earn no label", () => {
    expect(
      presentProductPromotions([], [loaded("p_order", { method: ORDER_PERCENT, status: "draft" })], CONTEXT)
    ).toEqual([])
  })
})

describe("matchBuyRulePromotionIds", () => {
  const product = { id: "prod_1", category_ids: ["pcat_1"], collection_id: null, type_id: null, tag_ids: [] }

  function buyGet(id: string, overrides: Partial<IndexedProductPromotion>): IndexedProductPromotion {
    return {
      promotionId: id,
      sellerId: null,
      campaignId: null,
      campaignStartsAt: null,
      campaignEndsAt: null,
      discountStartsAt: null,
      kind: "buy_get",
      rules: [{ attribute: "product_id", values: ["prod_1"] }],
      buyRules: [{ attribute: "category_id", values: ["pcat_1"] }],
      ...overrides,
    }
  }

  it("keeps only buy-gets whose buy and target rules both cover the product", () => {
    const matched = matchBuyRulePromotionIds(product, [
      buyGet("p_ok", {}),
      buyGet("p_other_buy", { buyRules: [{ attribute: "product_id", values: ["prod_2"] }] }),
      buyGet("p_unresolved", { buyRules: null }),
      buyGet("p_other_target", { rules: [{ attribute: "product_id", values: ["prod_2"] }] }),
      buyGet("p_percent", { kind: "percentage_off_product" }),
    ])
    expect([...matched]).toEqual(["p_ok"])
  })
})
