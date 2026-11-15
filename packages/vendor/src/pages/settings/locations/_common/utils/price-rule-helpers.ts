import type { InferClientInput } from "@mercurjs/client"

import { castNumber } from "@lib/cast-number"
import { sdk } from "@lib/client"
import { ITEM_TOTAL_ATTRIBUTE } from "@pages/settings/locations/_common/constants"

type ShippingOptionPrice = NonNullable<
  InferClientInput<typeof sdk.vendor.shippingOptions.$id.mutate>["prices"]
>[number]

type ShippingOptionPriceRule = NonNullable<
  ShippingOptionPrice["rules"]
>[number]

type ShippingOptionPriceRuleOperator = ShippingOptionPriceRule["operator"]

// Wire values of Medusa's PricingRuleOperator. The vendor API types the field
// as that TS enum, which this package cannot import, so form operators are
// narrowed by value.
const PRICE_RULE_OPERATORS: readonly string[] = ["gte", "lte", "gt", "lt", "eq"]

const isPriceRuleOperator = (
  operator: string
): operator is ShippingOptionPriceRuleOperator =>
  PRICE_RULE_OPERATORS.includes(operator)

export const buildShippingOptionPriceRules = (rule: {
  gte?: string | number | null
  lte?: string | number | null
  gt?: string | number | null
  lt?: string | number | null
  eq?: string | number | null
}): ShippingOptionPriceRule[] => {
  const conditions: {
    value: string | number | null | undefined
    operator: string
  }[] = [
    { value: rule.gte, operator: "gte" },
    { value: rule.lte, operator: "lte" },
    { value: rule.gt, operator: "gt" },
    { value: rule.lt, operator: "lt" },
    { value: rule.eq, operator: "eq" },
  ]

  return conditions.flatMap(({ operator, value }) =>
    value && isPriceRuleOperator(operator)
      ? [{ attribute: ITEM_TOTAL_ATTRIBUTE, operator, value: castNumber(value) }]
      : []
  )
}

// An emptied grid cell is "", while 0 is a real (free shipping) price.
export const hasPriceAmount = (
  value: string | number | undefined
): value is string | number => value !== undefined && value !== ""
