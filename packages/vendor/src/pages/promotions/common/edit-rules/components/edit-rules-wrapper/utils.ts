import { PromotionRuleResponse } from "@medusajs/types"

export const getRuleValue = (
  rule: PromotionRuleResponse
): string | number | string[] => {
  if (rule.field_type === "number") {
    const rawValue = Array.isArray(rule.values) ? rule.values[0] : rule.values
    return Number(rawValue)
  }

  return rule.values
}
