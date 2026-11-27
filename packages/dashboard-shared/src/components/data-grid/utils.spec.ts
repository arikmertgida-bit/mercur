import { describe, expect, test } from "vitest"

import type { DataGridFormValues } from "./types"
import {
  getValueAtPath,
  getVisibleIndex,
  getVisibleIndexes,
  setValueAtPath,
  toInputValue,
} from "./utils"

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

describe("data-grid visible index helpers", () => {
  const all = ["a", "b", "c", "d"].map((id) => ({ id }))
  const visible = all.filter(({ id }) => id !== "b")

  test("maps a matrix index to the index among visible items", () => {
    expect(getVisibleIndex(all, visible, 0)).toBe(0)
    expect(getVisibleIndex(all, visible, 2)).toBe(1)
    expect(getVisibleIndex(all, visible, 3)).toBe(2)
  })

  test("gives a hidden item the slot it takes once shown", () => {
    expect(getVisibleIndex(all, visible, 1)).toBe(1)
  })

  test("returns -1 outside the matrix", () => {
    expect(getVisibleIndex(all, visible, 4)).toBe(-1)
    expect(getVisibleIndex(all, visible, -1)).toBe(-1)
  })

  test("lists only the visible positions of the given indexes", () => {
    expect(getVisibleIndexes(all, visible, [1, 3, 7])).toEqual([2])
  })
})
