import type { PricingRuleOperatorValues } from "@medusajs/types"

import { castNumber } from "../../../../lib/cast-number"
import { ITEM_TOTAL_ATTRIBUTE } from "../constants"

const createPriceRule = (
  attribute: string,
  operator: PricingRuleOperatorValues,
  value: string | number
) => {
  const rule = {
    attribute,
    operator,
    value: castNumber(value),
  }

  return rule
}

export const buildShippingOptionPriceRules = (rule: {
  gte?: string | number | null
  lte?: string | number | null
  gt?: string | number | null
  lt?: string | number | null
  eq?: string | number | null
}) => {
  const conditions: {
    value: string | number | null | undefined
    operator: PricingRuleOperatorValues
  }[] = [
    { value: rule.gte, operator: "gte" },
    { value: rule.lte, operator: "lte" },
    { value: rule.gt, operator: "gt" },
    { value: rule.lt, operator: "lt" },
    { value: rule.eq, operator: "eq" },
  ]

  return conditions.flatMap(({ operator, value }) =>
    value ? [createPriceRule(ITEM_TOTAL_ATTRIBUTE, operator, value)] : []
  )
}
