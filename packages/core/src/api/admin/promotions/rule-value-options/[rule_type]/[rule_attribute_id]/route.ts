import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ApplicationMethodTargetTypeValues,
  HttpTypes,
  RuleTypeValues,
} from "@medusajs/types"

import {
  ruleQueryConfigurations,
  validateRuleAttribute,
  validateRuleType,
} from "../../../utils"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminRuleValueOptionsListResponse>
) => {
  const { rule_type: ruleType, rule_attribute_id: ruleAttributeId } = req.params
  const queryConfig = ruleQueryConfigurations[ruleAttributeId]
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const filterableFields: Record<string, string | string[] | undefined> = {
    ...(req.filterableFields as Record<string, string | string[] | undefined>),
  }

  if (filterableFields.value) {
    filterableFields[queryConfig.valueAttr] = filterableFields.value
    delete filterableFields.value
  }

  validateRuleType(ruleType)
  validateRuleAttribute({
    ruleType: ruleType as RuleTypeValues,
    ruleAttributeId,
    promotionType: undefined,
    applicationMethodType: undefined,
    applicationMethodTargetType:
      filterableFields.application_method_target_type as
        | ApplicationMethodTargetTypeValues
        | undefined,
  })

  if (filterableFields.application_method_target_type) {
    delete filterableFields.application_method_target_type
  }

  // A buyget promotion is scoped to one seller (see the "Store" field on
  // the create form); once that seller is chosen, restrict the product
  // picker to products actually belonging to them via the product_seller
  // link — products carry no `seller_id` column of their own.
  if (queryConfig.entryPoint === "product" && req.query.seller_id) {
    const { data: sellerProducts } = await query.graph({
      entity: "product_seller",
      fields: ["product_id"],
      filters: { seller_id: req.query.seller_id as string },
    })

    filterableFields.id = sellerProducts.map((r) => r.product_id)
  }

  const { data: rows, metadata } = await query.graph({
    entity: queryConfig.entryPoint,
    filters: filterableFields,
    fields: [queryConfig.labelAttr, queryConfig.valueAttr],
    pagination: req.queryConfig.pagination,
  })

  const values = (rows as Array<Record<string, string>>).map((r) => ({
    label: r[queryConfig.labelAttr],
    value: r[queryConfig.valueAttr],
  }))

  res.json({
    values,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
