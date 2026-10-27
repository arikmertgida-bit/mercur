import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

import { parseGraphRows } from "../../../../../../utils/graph-rows"
import { QueryFilter } from "../../../../../../utils/query-filter"
import {
  PromotionShapeQuerySchema,
  RuleValueFilterFields,
  toRuleValueOptions,
} from "../../../../../utils/promotion-rules"

import {
  ruleQueryConfigurations,
  validateRuleAttribute,
  validateRuleType,
} from "../../../utils"
import { AdminGetPromotionsRuleValueWithSellerType } from "../../../validators"

// The store picker of a buyget promotion passes the seller it is scoped to.
const SellerIdQuerySchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .catch(undefined)

const ProductIdRowSchema = z.object({ product_id: z.string() })

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<AdminGetPromotionsRuleValueWithSellerType>,
    RuleValueFilterFields
  >,
  res: MedusaResponse<HttpTypes.AdminRuleValueOptionsListResponse>
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

  // A buyget promotion is scoped to one seller (see the "Store" field on
  // the create form); once that seller is chosen, restrict the product
  // picker to products actually belonging to them via the product_seller
  // link — products carry no `seller_id` column of their own.
  const sellerId = SellerIdQuerySchema.parse(req.query.seller_id)
  if (queryConfig.entryPoint === "product" && sellerId) {
    const { data: sellerProducts } = await query.graph({
      entity: "product_seller",
      fields: ["product_id"],
      filters: { seller_id: sellerId },
    })

    filterableFields.id = parseGraphRows(ProductIdRowSchema, sellerProducts).map(
      (r) => r.product_id
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
