import { HttpTypes } from "@mercurjs/types"

import { PromotionRuleRow } from "../../form-values"

const getRuleRowValues = (
  rule: HttpTypes.AdminPromotionRuleDetail
): PromotionRuleRow["values"] => {
  const options = Array.isArray(rule.values) ? rule.values : []

  if (rule.field_type === "number" || rule.operator === "eq") {
    // Number-typed disguised rules carry their value directly.
    return typeof rule.values === "number"
      ? rule.values
      : (options[0]?.value ?? "")
  }

  return options.map((v) => v.value)
}

export const generateRuleAttributes = (
  rules: HttpTypes.AdminPromotionRuleDetail[] = []
): PromotionRuleRow[] =>
  rules.map((rule) => ({
    id: rule.id,
    required: rule.required,
    field_type: rule.field_type,
    disguised: rule.disguised,
    attribute: rule.attribute ?? "",
    operator: rule.operator ?? "",
    values: getRuleRowValues(rule),
  }))
