import { MedusaError } from "@medusajs/framework/utils"
import { getRuleAttributesMap } from "./rule-attributes-map"
import {
  ApplicationMethodTargetTypeValues,
  ApplicationMethodTypeValues,
  PromotionTypeValues,
} from "@medusajs/types"

export function validateRuleAttribute(attributes: {
  promotionType: PromotionTypeValues | undefined
  // The dashed route param (e.g. "target-rules"), a key of the attributes map.
  ruleType: string
  ruleAttributeId: string
  applicationMethodType?: ApplicationMethodTypeValues
  applicationMethodTargetType?: ApplicationMethodTargetTypeValues
}) {
  const {
    promotionType,
    ruleType,
    ruleAttributeId,
    applicationMethodType,
    applicationMethodTargetType,
  } = attributes

  const ruleAttributes =
    getRuleAttributesMap({
      promotionType,
      applicationMethodType,
      applicationMethodTargetType,
    })[ruleType] || []

  const ruleAttribute = ruleAttributes.find((obj) => obj.id === ruleAttributeId)

  if (!ruleAttribute) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid rule attribute - ${ruleAttributeId}`
    )
  }
}
