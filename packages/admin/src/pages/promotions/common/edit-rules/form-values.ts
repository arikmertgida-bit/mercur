import { CreatePromotionSchemaType } from "../../promotion-create/components/create-promotion-form/form-schema"

export type PromotionRuleRow = CreatePromotionSchemaType["rules"][number]

export type PromotionRuleScope =
  | "rules"
  | "application_method.buy_rules"
  | "application_method.target_rules"

/**
 * The part of a promotion form the rule fields work on. Both hosts — the
 * promotion create form and the edit-rules drawer — keep these fields with
 * this shape and render the rule fields inside their RHF provider.
 * `seller_id` is only set by the create form (buyget promotions are scoped
 * to one seller).
 */
export type PromotionRulesFormValues = {
  type?: string
  seller_id?: string
  rules: PromotionRuleRow[]
  application_method?: {
    type?: "fixed" | "percentage"
    target_type?: "order" | "shipping_methods" | "items"
    target_rules?: PromotionRuleRow[]
    buy_rules?: PromotionRuleRow[]
  }
}
