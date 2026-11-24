import {
  BatchMethodResponse,
  MedusaContainer,
  PromotionRuleDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  promiseAll,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"
import { PROMOTION_PRODUCT_NOT_OWNED_CODE } from "../../utils/vendor-error-codes"

const PromotionIdRowSchema = z.object({ promotion_id: z.string() })
const ProductIdRowSchema = z.object({ product_id: z.string() })
const RuleAttributeRowSchema = z.object({ id: z.string(), attribute: z.string() })

export const PRODUCT_RULE_ATTRIBUTE = "items.product.id"

type SellerRuleInput = {
  id?: string
  attribute?: string
  values: string | string[]
}

const toValueList = (values: string | string[]): string[] =>
  Array.isArray(values) ? values : [values]

/**
 * A seller promotion's rule may only name products of that seller. The
 * discount never reaches another seller's item anyway (the promotion is
 * scoped to the seller), but the stored rule would still point at a product
 * the seller does not own. Updates that keep the stored attribute are checked
 * against that attribute.
 */
export const validateSellerRuleProducts = async (
  scope: MedusaContainer,
  sellerId: string,
  rules: SellerRuleInput[]
): Promise<void> => {
  if (!rules.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const idsWithoutAttribute = rules
    .filter((rule) => rule.attribute === undefined && rule.id !== undefined)
    .map((rule) => rule.id)
    .filter((id): id is string => id !== undefined)

  const storedAttributes = new Map<string, string>()
  if (idsWithoutAttribute.length) {
    const { data } = await query.graph({
      entity: "promotion_rule",
      fields: ["id", "attribute"],
      filters: { id: idsWithoutAttribute },
    })
    for (const row of parseGraphRows(RuleAttributeRowSchema, data)) {
      storedAttributes.set(row.id, row.attribute)
    }
  }

  const productIds = new Set<string>()
  for (const rule of rules) {
    const attribute =
      rule.attribute ??
      (rule.id !== undefined ? storedAttributes.get(rule.id) : undefined)
    if (attribute !== PRODUCT_RULE_ATTRIBUTE) {
      continue
    }
    for (const value of toValueList(rule.values)) {
      productIds.add(value)
    }
  }

  if (!productIds.size) {
    return
  }

  const { data: links } = await query.graph({
    entity: "product_seller",
    fields: ["product_id"],
    filters: { seller_id: sellerId, product_id: Array.from(productIds) },
  })

  const owned = new Set(
    parseGraphRows(ProductIdRowSchema, links).map((link) => link.product_id)
  )

  for (const productId of productIds) {
    if (!owned.has(productId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Promotion rules can only use products of your store",
        PROMOTION_PRODUCT_NOT_OWNED_CODE
      )
    }
  }
}

export const refetchPromotion = async (
  promotionId: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [promotion],
  } = await query.graph({
    entity: "promotion",
    filters: { id: promotionId },
    fields,
  })

  return promotion
}

export const validateSellerPromotion = async (
  scope: MedusaContainer,
  sellerId: string,
  promotionId: string
) => {
  await validateSellerPromotions(scope, sellerId, [promotionId])
}

export const validateSellerPromotions = async (
  scope: MedusaContainer,
  sellerId: string,
  promotionIds: string[]
) => {
  if (!promotionIds.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerPromotions } = await query.graph({
    entity: "promotion_seller",
    filters: {
      seller_id: sellerId,
      promotion_id: promotionIds,
    },
    fields: ["promotion_id"],
  })

  const foundIds = new Set(
    parseGraphRows(PromotionIdRowSchema, sellerPromotions).map(
      (sp) => sp.promotion_id,
    ),
  )

  for (const promotionId of promotionIds) {
    if (!foundIds.has(promotionId)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Promotion with id: ${promotionId} was not found`
      )
    }
  }
}

export const refetchBatchRules = async (
  batchResult: BatchMethodResponse<PromotionRuleDTO>,
  scope: MedusaContainer,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  let created = Promise.resolve<PromotionRuleDTO[]>([])
  let updated = Promise.resolve<PromotionRuleDTO[]>([])

  if (batchResult.created.length) {
    created = query.graph({
      entity: "promotion_rule",
      filters: { id: batchResult.created.map((p) => p.id) },
      fields,
    }).then(({ data }) => data)
  }

  if (batchResult.updated.length) {
    updated = query.graph({
      entity: "promotion_rule",
      filters: { id: batchResult.updated.map((p) => p.id) },
      fields,
    }).then(({ data }) => data)
  }

  const [createdRes, updatedRes] = await promiseAll([created, updated])

  return {
    created: createdRes,
    updated: updatedRes,
    deleted: {
      ids: batchResult.deleted,
      object: "promotion-rule",
      deleted: true,
    },
  }
}
