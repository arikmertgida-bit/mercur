import { EditRulesType } from "../edit-rules-form/form-schema"

export const getRuleValue = (
  rule: EditRulesType["rules"][number]
): string | number | string[] => {
  if (rule.field_type === "number") {
    const rawValue = Array.isArray(rule.values) ? rule.values[0] : rule.values
    return Number.parseInt(String(rawValue), 10)
  }

  return rule.values
}
