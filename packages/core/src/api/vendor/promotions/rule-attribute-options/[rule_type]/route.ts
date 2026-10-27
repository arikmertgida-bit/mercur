import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { PromotionShapeQuerySchema } from "../../../../utils/promotion-rules"
import { getRuleAttributesMap, validateRuleType } from "../../utils"
import { VendorGetPromotionRuleParamsType } from "../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetPromotionRuleParamsType>,
  res: MedusaResponse<HttpTypes.VendorRuleAttributeOptionsListResponse>
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
