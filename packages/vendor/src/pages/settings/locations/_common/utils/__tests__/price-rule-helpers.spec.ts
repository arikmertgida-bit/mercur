import { describe, expect, it } from "vitest"

import {
  buildShippingOptionPriceRules,
  hasPriceAmount,
} from "../price-rule-helpers"

describe("hasPriceAmount", () => {
  it("keeps a 0 (free shipping) price", () => {
    expect(hasPriceAmount(0)).toBe(true)
    expect(hasPriceAmount("0")).toBe(true)
  })

  it("treats an emptied cell as no price", () => {
    expect(hasPriceAmount("")).toBe(false)
    expect(hasPriceAmount(undefined)).toBe(false)
  })
})

describe("buildShippingOptionPriceRules", () => {
  it("builds item_total rules from the min/max bounds", () => {
    expect(
      buildShippingOptionPriceRules({ gte: "100,5", lte: 500, gt: null })
    ).toEqual([
      { attribute: "item_total", operator: "gte", value: 100.5 },
      { attribute: "item_total", operator: "lte", value: 500 },
    ])
  })
})
