import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AdminGetPromotionRuleParamsType } from "@medusajs/medusa/api/admin/promotions/validators"
import { HttpTypes } from "@medusajs/types"

import { PromotionShapeQuerySchema } from "../../../../utils/promotion-rules"
import { getRuleAttributesMap, validateRuleType } from "../../utils"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetPromotionRuleParamsType>,
  res: MedusaResponse<HttpTypes.AdminRuleAttributeOptionsListResponse>
) => {
  const { rule_type: ruleType } = req.params

  validateRuleType(ruleType)

  const shapeQuery = PromotionShapeQuerySchema.parse(req.query)

  const attributes =
    getRuleAttributesMap({
      promotionType: shapeQuery.promotion_type,
      applicationMethodType: shapeQuery.application_method_type,
      applicationMethodTargetType: shapeQuery.application_method_target_type,
    })[ruleType] || []

  res.json({
    attributes,
  })
}
