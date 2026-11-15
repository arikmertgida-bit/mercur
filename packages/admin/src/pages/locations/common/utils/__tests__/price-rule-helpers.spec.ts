import { describe, expect, it } from "vitest"

import { hasPriceAmount } from "../price-rule-helpers"

describe("hasPriceAmount", () => {
  it("keeps a 0 (free shipping) price so saving does not delete it", () => {
    expect(hasPriceAmount(0)).toBe(true)
  })

  it("treats an emptied cell as no price", () => {
    expect(hasPriceAmount("")).toBe(false)
    expect(hasPriceAmount(undefined)).toBe(false)
  })
})
