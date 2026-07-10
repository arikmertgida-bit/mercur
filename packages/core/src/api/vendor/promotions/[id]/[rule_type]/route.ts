import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ApplicationMethodTargetTypeValues,
  ApplicationMethodTypeValues,
  PromotionRuleOperatorValues,
  PromotionTypeValues,
} from "@medusajs/types"
import {
  ContainerRegistrationKeys,
  RuleOperator,
  RuleType,
} from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerPromotion } from "../../helpers"
import {
  getRuleAttributesMap,
  operatorsMap,
  ruleQueryConfigurations,
  validateRuleType,
} from "../../utils"
import { VendorGetPromotionRuleTypeParamsType } from "../../validators"

type RuleAttribute = {
  id: string
  value: string
  label: string
  required: boolean
  field_type: string
  operators: { id: RuleOperator; value: RuleOperator; label: string }[]
  disguised?: boolean
  hydrate?: boolean
}

type PromotionRuleValue = { id: string; value: string; label?: string }

type PromotionRule = {
  id: string
  attribute?: string
  attribute_label?: string
  operator?: PromotionRuleOperatorValues
  operator_label?: string
  value?: string | undefined
  values: PromotionRuleValue[]
}

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetPromotionRuleTypeParamsType>,
  res: MedusaResponse<HttpTypes.VendorPromotionRuleListResponse>
) => {
  const { id, rule_type: ruleType } = req.params

  await validateSellerPromotion(req.scope, req.seller_context!.seller_id, id)

  validateRuleType(ruleType)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const dasherizedRuleType = ruleType.split("-").join("_")

  const {
    data: [promotion],
  } = await query.graph({
    entity: "promotion",
    filters: { id },
    fields: req.queryConfig.fields,
  })

  const ruleAttributes: RuleAttribute[] = getRuleAttributesMap({
    promotionType:
      promotion?.type || (req.query.promotion_type as PromotionTypeValues | undefined),
    applicationMethodType:
      promotion?.application_method?.type ||
      (req.query.application_method_type as ApplicationMethodTypeValues | undefined),
    applicationMethodTargetType:
      promotion?.application_method?.target_type ||
      (req.query.application_method_target_type as
        | ApplicationMethodTargetTypeValues
        | undefined),
  })[ruleType]

  const promotionRules: PromotionRule[] = []

  if (dasherizedRuleType === RuleType.RULES) {
    promotionRules.push(...(promotion?.rules || []))
  } else if (dasherizedRuleType === RuleType.TARGET_RULES) {
    promotionRules.push(...(promotion?.application_method?.target_rules || []))
  } else if (dasherizedRuleType === RuleType.BUY_RULES) {
    promotionRules.push(...(promotion?.application_method?.buy_rules || []))
  }

  const transformedRules: PromotionRule[] = []
  const disguisedRules = ruleAttributes.filter((attr) => !!attr.disguised)

  for (const disguisedRule of disguisedRules) {
    const getValues = (): PromotionRuleValue[] | string | undefined => {
      const value = (
        promotion?.application_method as
          | Record<string, string | undefined>
          | undefined
      )?.[disguisedRule.id]

      if (disguisedRule.field_type === "number") {
        return value
      }

      if (value) {
        return [{ id: value, label: value, value }]
      }

      return []
    }

    const required = disguisedRule.required ?? true
    const applicationMethod = promotion?.application_method as
      | Record<string, string | undefined>
      | undefined
    const recordValue = applicationMethod?.[disguisedRule.id]

    if (required || recordValue) {
      transformedRules.push({
        ...disguisedRule,
        // The real Medusa PromotionRuleDTO contract requires a real `id`;
        // this rule is synthetic (not a materialized DB row), so the
        // disguised-rule's own stable id (e.g. "currency_code") stands in.
        id: disguisedRule.id,
        attribute: disguisedRule.id,
        attribute_label: disguisedRule.label,
        operator: RuleOperator.EQ,
        operator_label: operatorsMap[RuleOperator.EQ].label,
        value: undefined,
        values: getValues() as PromotionRuleValue[],
      })
    }
  }

  for (const promotionRule of [...promotionRules, ...transformedRules]) {
    const currentRuleAttribute = ruleAttributes.find(
      (attr) =>
        attr.value === promotionRule.attribute ||
        attr.value === promotionRule.attribute
    )

    if (!currentRuleAttribute) {
      continue
    }

    const queryConfig = ruleQueryConfigurations[currentRuleAttribute.id]

    if (!queryConfig) {
      continue
    }

    const { data: rows } = await query.graph({
      entity: queryConfig.entryPoint,
      filters: {
        [queryConfig.valueAttr]: promotionRule.values?.map((v) => v.value),
      },
      fields: [queryConfig.labelAttr, queryConfig.valueAttr],
    })

    const valueLabelMap = new Map<string, string>(
      rows.map((row: Record<string, string>) => [
        row[queryConfig.valueAttr],
        row[queryConfig.labelAttr],
      ])
    )

    promotionRule.values =
      promotionRule.values?.map((value) => ({
        id: value.id,
        value: value.value,
        label: valueLabelMap.get(value.value) || value.value,
      })) || promotionRule.values

    if (!currentRuleAttribute.hydrate) {
      transformedRules.push({
        ...currentRuleAttribute,
        ...promotionRule,
        attribute_label: currentRuleAttribute.label,
        operator_label:
          operatorsMap[promotionRule.operator as keyof typeof operatorsMap]?.label ||
          promotionRule.operator,
      })
    }
  }

  res.json({
    rules: transformedRules,
  })
}
