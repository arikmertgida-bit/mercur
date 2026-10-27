import { describe, expect, test } from "vitest"

import type { DataGridFormValues } from "./types"
import { getValueAtPath, setValueAtPath, toInputValue } from "./utils"

describe("data-grid form path helpers", () => {
  test("reads nested object and array paths", () => {
    const values: DataGridFormValues = {
      variants: [{ prices: { usd: 10 } }],
    }

    expect(getValueAtPath(values, "variants.0.prices.usd")).toBe(10)
    expect(getValueAtPath(values, "variants.1.prices.usd")).toBeUndefined()
    expect(getValueAtPath(values, "missing.path")).toBeUndefined()
  })

  test("writes in place and creates missing objects", () => {
    const values: DataGridFormValues = { variants: [{ title: "a" }] }

    setValueAtPath(values, "variants.0.title", "b")
    setValueAtPath(values, "stock.loc_1.quantity", 3)

    expect(values).toEqual({
      variants: [{ title: "b" }],
      stock: { loc_1: { quantity: 3 } },
    })
  })

  test("normalizes values for text inputs", () => {
    expect(toInputValue("x")).toBe("x")
    expect(toInputValue(4)).toBe(4)
    expect(toInputValue(null)).toBe("")
    expect(toInputValue(undefined)).toBe("")
    expect(toInputValue(true)).toBe("true")
  })
})
