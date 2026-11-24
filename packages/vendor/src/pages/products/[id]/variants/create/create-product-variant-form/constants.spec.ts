import { describe, expect, test } from "vitest"

import { CreateProductVariantSchema, toVariantStockPayload } from "./constants"

const stocked = {
  prices: { try: "149.90", usd: "" },
  inventory: { sloc_1: "5", sloc_2: "" },
}

const issuePaths = (input: unknown): string[] => {
  const result = CreateProductVariantSchema.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("CreateProductVariantSchema", () => {
  test("rejects an empty title", () => {
    expect(
      issuePaths({ title: "", sku: "", options: {}, ...stocked })
    ).toContain("title")
  })

  test("rejects an unselected variant option", () => {
    expect(
      issuePaths({
        title: "XS / Green",
        options: { size: "XS", color: "" },
        ...stocked,
      })
    ).toContain("options.color")
  })

  test("accepts a valid payload with every option selected", () => {
    expect(
      issuePaths({
        title: "XS / Green",
        sku: "SKU-1",
        options: { size: "XS", color: "Green" },
        ...stocked,
      })
    ).toEqual([])
  })

  test("accepts a variant with no options", () => {
    expect(
      issuePaths({ title: "Default variant", options: {}, ...stocked })
    ).toEqual([])
  })

  test("requires a price in at least one currency, shown on the first currency", () => {
    expect(
      issuePaths({
        title: "No price",
        prices: { try: "", usd: "" },
        inventory: stocked.inventory,
      })
    ).toEqual(["prices.try"])
  })

  test("requires a positive stock in at least one location, shown on the first location", () => {
    expect(
      issuePaths({
        title: "No stock",
        prices: stocked.prices,
        inventory: { sloc_1: "0", sloc_2: "" },
      })
    ).toEqual(["inventory.sloc_1"])
  })

  test("rejects a fractional or negative stock quantity", () => {
    expect(
      issuePaths({
        title: "Bad stock",
        prices: stocked.prices,
        inventory: { sloc_1: "5", sloc_2: "1.5" },
      })
    ).toEqual(["inventory.sloc_2"])
    expect(
      issuePaths({
        title: "Negative stock",
        prices: stocked.prices,
        inventory: { sloc_1: "5", sloc_2: "-2" },
      })
    ).toEqual(["inventory.sloc_2"])
  })
})

test("accepts the number the currency input reports", () => {
  expect(
    issuePaths({
      title: "Numeric price",
      prices: { try: 249, usd: "" },
      inventory: stocked.inventory,
    })
  ).toEqual([])
})

describe("toVariantStockPayload", () => {
  test("sends only typed prices and positive stock", () => {
    expect(
      toVariantStockPayload({
        prices: { try: 149.9, usd: "", eur: "0" },
        inventory: { sloc_1: "5", sloc_2: "", sloc_3: "0" },
      })
    ).toEqual({
      prices: [
        { currency_code: "try", amount: 149.9 },
        { currency_code: "eur", amount: 0 },
      ],
      inventory: [{ location_id: "sloc_1", quantity: 5 }],
    })
  })
})
