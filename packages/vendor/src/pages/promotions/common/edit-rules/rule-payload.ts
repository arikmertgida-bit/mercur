import type { PromotionRuleOperatorValues } from "@medusajs/types"
import { z } from "zod"

const PromotionRuleOperatorSchema = z.enum([
  "gte",
  "lte",
  "gt",
  "lt",
  "eq",
  "ne",
  "in",
])

/** Narrows a rule row's operator (a select value) to Medusa's operators. */
export const toPromotionRuleOperator = (
  operator: string
): PromotionRuleOperatorValues | undefined => {
  const parsed = PromotionRuleOperatorSchema.safeParse(operator)

  return parsed.success ? parsed.data : undefined
}

/**
 * Rule values go to the API as strings; number fields keep a number in the
 * form row.
 */
export const toRuleValues = (
  values: string | number | string[]
): string | string[] => (typeof values === "number" ? String(values) : values)
