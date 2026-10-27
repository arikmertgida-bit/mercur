import { CreatePromotionSchemaType } from "../../create/create-promotion-form/form-schema"

export type PromotionRuleRow = CreatePromotionSchemaType["rules"][number]

/**
 * The part of a promotion form the rule fields work on. Both hosts — the
 * promotion create form and the edit-rules drawer — keep these fields with
 * this shape and render the rule fields inside their RHF provider.
 */
export type PromotionRulesFormValues = {
  type?: string
  rules: PromotionRuleRow[]
  application_method?: {
    type?: "fixed" | "percentage"
    target_type?: "order" | "shipping_methods" | "items"
    target_rules?: PromotionRuleRow[]
    buy_rules?: PromotionRuleRow[]
  }
}
