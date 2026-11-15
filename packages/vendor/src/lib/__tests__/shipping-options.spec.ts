import type { HttpTypes } from "@medusajs/types"
import { describe, expect, test } from "vitest"

import { buildShippingOptionRules } from "../shipping-options"

const rule = (
  id: string,
  attribute: string,
  value: string
): HttpTypes.AdminShippingOptionRule => ({
  id,
  attribute,
  operator: "eq",
  value,
  shipping_option_id: "so_1",
  created_at: "2026-11-16T00:00:00.000Z",
  updated_at: "2026-11-16T00:00:00.000Z",
  deleted_at: null,
})

describe("buildShippingOptionRules", () => {
  test("keeps existing rules and updates enabled_in_store", () => {
    const rules = buildShippingOptionRules(
      {
        rules: [
          rule("r_1", "is_return", "false"),
          rule("r_2", "enabled_in_store", "true"),
        ],
      },
      false
    )

    expect(rules).toEqual([
      { id: "r_1", attribute: "is_return", operator: "eq", value: "false" },
      {
        id: "r_2",
        attribute: "enabled_in_store",
        operator: "eq",
        value: "false",
      },
    ])
  })

  test("adds the missing rules so the option stops matching returns", () => {
    expect(buildShippingOptionRules({ rules: [] }, true)).toEqual([
      { attribute: "enabled_in_store", operator: "eq", value: "true" },
      { attribute: "is_return", operator: "eq", value: "false" },
    ])
  })
})
