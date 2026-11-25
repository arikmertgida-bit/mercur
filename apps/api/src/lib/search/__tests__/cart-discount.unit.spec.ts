import { buildCartDiscount, toCartDiscountStep } from "../cart-discount"
import { facts, FactsOverrides, HOUR, iso, NOW } from "./promotion-facts"
import { LoadedPromotion, presentProductPromotions } from "../promotion-details"

const CONTEXT = { currency_code: "try", product_discountable: true, now: NOW, buy_rule_matches: new Set<string>() }

describe("toCartDiscountStep", () => {
  it("accepts an automatic item percentage promotion of a running campaign", () => {
    expect(toCartDiscountStep(facts({ id: "p" }), CONTEXT)).toEqual({
      type: "percentage",
      value: 10,
      budget_remaining: null,
    })
  })

  it.each([
    ["a coupon-code promotion", { is_automatic: false }],
    ["an inactive promotion", { status: "draft" }],
    ["a buy-get promotion", { type: "buyget" }],
    ["a promotion with cart rules", { rule_count: 1 }],
    ["an order promotion", { method: { type: "percentage", target_type: "order", value: 10, currency_code: null } }],
    ["a shipping promotion", { method: { type: "fixed", target_type: "shipping_methods", value: 10, currency_code: "try" } }],
    ["an ended campaign", { campaign: { starts_at: iso(-2 * HOUR), ends_at: iso(-HOUR), budget: null } }],
    ["a campaign that has not started", { campaign: { starts_at: iso(HOUR), ends_at: iso(2 * HOUR), budget: null } }],
    ["a promotion past its usage limit", { limit: 5, used: 5 }],
    ["a spent budget", { campaign: { starts_at: null, ends_at: null, budget: { type: "spend", limit: 100, used: 100 } } }],
    ["a used-up usage budget", { campaign: { starts_at: null, ends_at: null, budget: { type: "usage", limit: 3, used: 3 } } }],
    ["another currency", { method: { type: "fixed", target_type: "items", value: 10, currency_code: "eur" } }],
  ])("rejects %s", (_label, overrides) => {
    expect(toCartDiscountStep(facts({ id: "p", ...overrides }), CONTEXT)).toBeNull()
  })

  it("rejects a fixed amount when the cart currency is unknown", () => {
    const fixed = facts({ id: "p", method: { type: "fixed", target_type: "items", value: 50, currency_code: "try" } })
    expect(toCartDiscountStep(fixed, { currency_code: null, now: NOW })).toBeNull()
    expect(toCartDiscountStep(fixed, CONTEXT)).toEqual({ type: "fixed", value: 50, budget_remaining: null })
  })

  it("passes the remaining spend budget on", () => {
    const step = toCartDiscountStep(
      facts({ id: "p", campaign: { starts_at: null, ends_at: null, budget: { type: "spend", limit: 1000, used: 400 } } }),
      CONTEXT
    )
    expect(step?.budget_remaining).toBe(600)
  })
})

describe("buildCartDiscount", () => {
  it("keeps every applicable promotion in Medusa's value-descending order", () => {
    const result = buildCartDiscount(
      [
        facts({ id: "p_small" }),
        facts({ id: "p_code", is_automatic: false, method: { type: "percentage", target_type: "items", value: 50, currency_code: null } }),
        facts({ id: "p_big", method: { type: "percentage", target_type: "items", value: 20, currency_code: null } }),
      ],
      CONTEXT
    )
    expect(result?.promotionIds).toEqual(["p_big", "p_small"])
    expect(result?.discount.steps.map((step) => step.value)).toEqual([20, 10])
  })

  it("gives nothing for a non-discountable product", () => {
    expect(buildCartDiscount([facts({ id: "p" })], { ...CONTEXT, product_discountable: false })).toBeNull()
  })

  it("gives nothing when no promotion applies", () => {
    expect(buildCartDiscount([facts({ id: "p", rule_count: 2 })], CONTEXT)).toBeNull()
  })
})

describe("presentProductPromotions", () => {
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

  it("leads with the promotion the cart applies first and attaches the combined discount", () => {
    const presented = presentProductPromotions(
      [
        loaded("p_code", { is_automatic: false }),
        loaded("p_auto", { method: { type: "percentage", target_type: "items", value: 15, currency_code: null } }),
      ],
      [],
      CONTEXT
    )
    expect(presented.map((promotion) => promotion.id)).toEqual(["p_auto", "p_code"])
    expect(presented[0].cart_discount?.steps).toEqual([
      { type: "percentage", value: 15, budget_remaining: null },
    ])
    expect(presented[1].cart_discount).toBeNull()
  })

  it("keeps the matched order without a cart discount", () => {
    const presented = presentProductPromotions(
      [loaded("p_a", { is_automatic: false }), loaded("p_b", { type: "buyget" })],
      [],
      CONTEXT
    )
    expect(presented.map((promotion) => promotion.id)).toEqual(["p_a", "p_b"])
    expect(presented.every((promotion) => promotion.cart_discount === null)).toBe(true)
  })
})
