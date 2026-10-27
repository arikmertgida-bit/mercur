import { describe, expect, test } from "vitest"
import { z } from "zod"

import {
  DateComparisonFilterSchema,
  NumberFilterValueSchema,
  RangeNumberFilterValueSchema,
  parseJsonQueryParam,
} from "./query-filters"

describe("parseJsonQueryParam", () => {
  test("parses and validates a JSON query param", () => {
    expect(
      parseJsonQueryParam('{"$gte":"2026-01-01"}', DateComparisonFilterSchema)
    ).toEqual({ $gte: "2026-01-01" })
    expect(parseJsonQueryParam("true", z.boolean())).toBe(true)
  })

  test("ignores empty, malformed or mis-shaped values", () => {
    expect(parseJsonQueryParam(undefined, z.boolean())).toBeUndefined()
    expect(parseJsonQueryParam(null, z.boolean())).toBeUndefined()
    expect(parseJsonQueryParam("", z.boolean())).toBeUndefined()
    expect(parseJsonQueryParam("{not json", z.boolean())).toBeUndefined()
    expect(
      parseJsonQueryParam('{"$gte":5}', DateComparisonFilterSchema)
    ).toBeUndefined()
  })
})

describe("filter value schemas", () => {
  test("number filters accept an exact number or operators", () => {
    expect(NumberFilterValueSchema.parse(5)).toBe(5)
    expect(NumberFilterValueSchema.parse({ $gt: 1, $lte: 9 })).toEqual({
      $gt: 1,
      $lte: 9,
    })
    expect(NumberFilterValueSchema.safeParse({ $gt: "1" }).success).toBe(false)
  })

  test("the legacy range filter keeps raw input text", () => {
    expect(RangeNumberFilterValueSchema.parse({ gt: "1", lt: 3 })).toEqual({
      gt: "1",
      lt: 3,
    })
    expect(RangeNumberFilterValueSchema.parse(7)).toBe(7)
  })
})
