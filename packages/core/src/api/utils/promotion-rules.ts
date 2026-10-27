import {
  ApplicationMethodTargetType,
  ApplicationMethodType,
  PromotionType,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRow } from "../../utils/graph-rows"
import { QueryFilter } from "../../utils/query-filter"
import { DisguisedRule } from "../admin/promotions/utils"

// The promotion shape is read from these query params when the promotion does
// not exist yet. A value that is not a known enum member is ignored, as it
// would never match one.
export const PromotionShapeQuerySchema = z.object({
  promotion_type: z.enum(PromotionType).optional().catch(undefined),
  application_method_type: z
    .enum(ApplicationMethodType)
    .optional()
    .catch(undefined),
  application_method_target_type: z
    .enum(ApplicationMethodTargetType)
    .optional()
    .catch(undefined),
})

type DisguisedRuleSource = {
  apply_to_quantity?: number | null
  buy_rules_min_quantity?: number | null
  currency_code?: string | null
} | null

// Disguised rules are application method columns presented as rules.
export const getDisguisedRuleValue = (
  applicationMethod: DisguisedRuleSource | undefined,
  ruleId: string
): string | number | null | undefined => {
  switch (ruleId) {
    case DisguisedRule.APPLY_TO_QUANTITY:
      return applicationMethod?.apply_to_quantity
    case DisguisedRule.BUY_RULES_MIN_QUANTITY:
      return applicationMethod?.buy_rules_min_quantity
    case DisguisedRule.CURRENCY_CODE:
      return applicationMethod?.currency_code
    default:
      return undefined
  }
}

/**
 * `filterableFields` of the rule-value-options routes: the option filters plus
 * the value and target type the handler moves out before querying.
 */
export type RuleValueFilterFields = QueryFilter & {
  value?: string | string[]
  application_method_target_type?: string
}

const RuleValueOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

export type RuleValueOption = z.infer<typeof RuleValueOptionSchema>

/**
 * Rule value options are read from whichever entity backs the rule attribute,
 * so the label and value columns are only known at runtime.
 */
export const toRuleValueOptions = (
  rows: ReadonlyArray<Partial<Record<string, string | null>>>,
  config: { labelAttr: string; valueAttr: string }
): RuleValueOption[] =>
  rows.map((row) =>
    parseGraphRow(RuleValueOptionSchema, {
      label: row[config.labelAttr],
      value: row[config.valueAttr],
    })
  )
