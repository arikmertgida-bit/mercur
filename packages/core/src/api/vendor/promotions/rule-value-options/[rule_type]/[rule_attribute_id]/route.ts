import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"
import { z } from "zod"

import {
  ruleQueryConfigurations,
  validateRuleAttribute,
  validateRuleType,
} from "../../../utils"
import { VendorGetPromotionsRuleValueParamsType } from "../../../validators"
import { getSellerId } from "../../../../../utils/seller-context"
import {
  PromotionShapeQuerySchema,
  RuleValueFilterFields,
  toRuleValueOptions,
} from "../../../../../utils/promotion-rules"
import { parseGraphRow } from "../../../../../../utils/graph-rows"
import { QueryFilter } from "../../../../../../utils/query-filter"

const LinkedIdSchema = z.string()

export const GET = async (
  req: AuthenticatedMedusaRequest<
    VendorGetPromotionsRuleValueParamsType,
    RuleValueFilterFields
  >,
  res: MedusaResponse<HttpTypes.VendorRuleValueOptionsListResponse>
) => {
  const { rule_type: ruleType, rule_attribute_id: ruleAttributeId } = req.params
  const queryConfig = ruleQueryConfigurations[ruleAttributeId]
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { value, application_method_target_type: targetType } =
    req.filterableFields
  const filterableFields: QueryFilter = { ...req.filterableFields }

  if (value) {
    filterableFields[queryConfig.valueAttr] = value
    delete filterableFields.value
  }

  validateRuleType(ruleType)
  validateRuleAttribute({
    ruleType,
    ruleAttributeId,
    promotionType: undefined,
    applicationMethodType: undefined,
    applicationMethodTargetType:
      PromotionShapeQuerySchema.shape.application_method_target_type.parse(
        targetType
      ),
  })

  if (targetType) {
    delete filterableFields.application_method_target_type
  }

  if (queryConfig.sellerScoped) {
    const { data: sellerResources } = await query.graph({
      entity: `${queryConfig.entryPoint}_seller`,
      fields: [`${queryConfig.entryPoint}_id`],
      filters: {
        seller_id: getSellerId(req),
      },
    })

    filterableFields.id = sellerResources.map((r) =>
      parseGraphRow(LinkedIdSchema, r[`${queryConfig.entryPoint}_id`])
    )
  }

  const { data: rows, metadata } = await query.graph({
    entity: queryConfig.entryPoint,
    filters: filterableFields,
    fields: [queryConfig.labelAttr, queryConfig.valueAttr],
    pagination: req.queryConfig.pagination,
  })

  const values = toRuleValueOptions(rows, queryConfig)

  res.json({
    values,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
