import { PromotionRuleResponse } from "@medusajs/types"

export const getRuleValue = (rule: PromotionRuleResponse) => {
  if (rule.field_type === "number") {
    return parseInt(rule.values as string)
  }

  return rule.values
}
