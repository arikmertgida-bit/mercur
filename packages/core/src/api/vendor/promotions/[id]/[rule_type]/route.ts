import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
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
  RuleAttributeDefinition,
  ruleQueryConfigurations,
  validateRuleType,
} from "../../utils"
import { VendorGetPromotionRuleTypeParamsType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"
import {
  getDisguisedRuleValue,
  PromotionShapeQuerySchema,
} from "../../../../utils/promotion-rules"

type PromotionRule = HttpTypes.VendorPromotionRuleDetail

const getOperatorLabel = (operator?: string): string | undefined =>
  Object.values(operatorsMap).find((entry) => entry.value === operator)?.label

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetPromotionRuleTypeParamsType>,
  res: MedusaResponse<HttpTypes.VendorPromotionRuleListResponse>
) => {
  const { id, rule_type: ruleType } = req.params

  await validateSellerPromotion(req.scope, getSellerId(req), id)

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

  const shapeQuery = PromotionShapeQuerySchema.parse(req.query)

  const ruleAttributes: RuleAttributeDefinition[] = getRuleAttributesMap({
    promotionType: promotion?.type || shapeQuery.promotion_type,
    applicationMethodType:
      promotion?.application_method?.type ||
      shapeQuery.application_method_type,
    applicationMethodTargetType:
      promotion?.application_method?.target_type ||
      shapeQuery.application_method_target_type,
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
    const recordValue = getDisguisedRuleValue(
      promotion?.application_method,
      disguisedRule.id
    )

    const getValues = (): PromotionRule["values"] => {
      // Only the quantity columns are number-typed, so a string never
      // reaches this branch.
      if (disguisedRule.field_type === "number") {
        return typeof recordValue === "string" ? undefined : recordValue
      }

      if (recordValue) {
        const value = String(recordValue)
        return [{ id: value, label: value, value }]
      }

      return []
    }

    const required = disguisedRule.required ?? true

    if (required || recordValue) {
      transformedRules.push({
        ...disguisedRule,
        // The rule is synthetic (not a materialized DB row), so the
        // disguised rule's own stable id (e.g. "currency_code") stands in.
        id: disguisedRule.id,
        attribute: disguisedRule.id,
        attribute_label: disguisedRule.label,
        operator: RuleOperator.EQ,
        operator_label: operatorsMap[RuleOperator.EQ].label,
        value: undefined,
        values: getValues(),
      })
    }
  }

  for (const promotionRule of [...promotionRules, ...transformedRules]) {
    const currentRuleAttribute = ruleAttributes.find(
      (attr) => attr.value === promotionRule.attribute
    )

    if (!currentRuleAttribute) {
      continue
    }

    const queryConfig = ruleQueryConfigurations[currentRuleAttribute.id]

    if (!queryConfig) {
      continue
    }

    const ruleValues = Array.isArray(promotionRule.values)
      ? promotionRule.values
      : undefined

    const { data: rows } = await query.graph({
      entity: queryConfig.entryPoint,
      filters: {
        [queryConfig.valueAttr]: ruleValues?.map((v) => v.value),
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
      ruleValues?.map((value) => ({
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
          getOperatorLabel(promotionRule.operator) || promotionRule.operator,
      })
    }
  }

  res.json({
    rules: transformedRules,
  })
}
