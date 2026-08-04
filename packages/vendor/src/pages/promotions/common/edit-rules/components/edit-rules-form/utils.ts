import { TFunction } from "i18next"
import {
  ExtendedPromotionRule,
  PromotionRuleFormData,
} from "@custom-types/promotion"

const RULE_ATTRIBUTE_LABEL_KEYS: Record<string, string> = {
  customer_group: "promotions.ruleAttributes.customerGroup",
  region: "fields.region",
  country: "fields.country",
  sales_channel: "fields.salesChannel",
  product: "fields.product",
  product_category: "promotions.ruleAttributes.productCategory",
  product_collection: "promotions.ruleAttributes.productCollection",
  product_type: "promotions.ruleAttributes.productType",
  product_tag: "promotions.ruleAttributes.productTag",
  shipping_option_type: "promotions.ruleAttributes.shippingOptionType",
  currency_code: "promotions.ruleAttributes.currencyCode",
  apply_to_quantity: "promotions.ruleAttributes.applyToQuantity",
  buy_rules_min_quantity: "promotions.ruleAttributes.minQuantity",
}

const RULE_OPERATOR_LABEL_KEYS: Record<string, string> = {
  in: "operators.in",
  eq: "operators.eq",
  ne: "operators.notIn",
}

export const translateRuleAttributeLabel = (
  t: TFunction,
  attributeId: string | undefined,
  fallback: string
): string => {
  const key = attributeId ? RULE_ATTRIBUTE_LABEL_KEYS[attributeId] : undefined
  return key ? t(key) : fallback
}

export const translateRuleOperatorLabel = (
  t: TFunction,
  operatorId: string | undefined,
  fallback: string
): string => {
  const key = operatorId ? RULE_OPERATOR_LABEL_KEYS[operatorId] : undefined
  return key ? t(key) : fallback
}

export const generateRuleAttributes = (
  rules?: ExtendedPromotionRule[]
): PromotionRuleFormData[] =>
  (rules || []).map((rule): PromotionRuleFormData => {
    let values: string | string[]
    const firstValue = Array.isArray(rule.values)
      ? rule.values[0]?.value
      : rule.values

    if (rule.field_type === "number") {
      values = firstValue ? String(firstValue) : ""
    } else if (rule.operator === "eq") {
      values = firstValue ? String(firstValue) : ""
    } else {
      values = Array.isArray(rule.values)
        ? rule.values.map((v) => String(v.value || "")).filter(Boolean)
        : []
    }

    return {
      id: rule.id,
      required: rule.required,
      field_type: rule.field_type,
      disguised: rule.disguised,
      attribute: rule.attribute || "",
      operator: rule.operator || "",
      values,
    }
  })
