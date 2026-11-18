import {
  BatchMethodResponse,
  MedusaContainer,
  ShippingOptionRuleDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  promiseAll,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"
import { validateSellerFulfillmentSet } from "../fulfillment-sets/helpers"

const ServiceZoneRowSchema = z.object({ fulfillment_set_id: z.string() })

const IdRowSchema = z.object({ id: z.string() })

const ShippingOptionChildrenRowSchema = z.object({
  rules: z.array(IdRowSchema.nullable()).nullish(),
  prices: z.array(IdRowSchema.nullable()).nullish(),
})

/**
 * A service zone has no seller link of its own; it belongs to the seller
 * that owns the stock location its fulfillment set is attached to.
 */
export const validateSellerServiceZone = async (
  scope: MedusaContainer,
  sellerId: string,
  serviceZoneId: string
): Promise<void> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "service_zone",
    filters: { id: serviceZoneId },
    fields: ["fulfillment_set_id"],
  })

  const [zone] = parseGraphRows(ServiceZoneRowSchema, data)

  if (!zone) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Service zone with id: ${serviceZoneId} was not found`
    )
  }

  await validateSellerFulfillmentSet(scope, sellerId, zone.fulfillment_set_id)
}

/**
 * Medusa updates and deletes rules and prices by their own id, without
 * checking which shipping option they belong to. Ids sent through a
 * seller's option must therefore be that option's own rules and prices.
 */
export const validateShippingOptionChildIds = async (
  scope: MedusaContainer,
  shippingOptionId: string,
  ids: { rule_ids?: string[]; price_ids?: string[] }
): Promise<void> => {
  const ruleIds = ids.rule_ids ?? []
  const priceIds = ids.price_ids ?? []

  if (!ruleIds.length && !priceIds.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "shipping_option",
    filters: { id: shippingOptionId },
    fields: ["rules.id", "prices.id"],
  })

  const [option] = parseGraphRows(ShippingOptionChildrenRowSchema, data)
  const ownIds = (rows: ({ id: string } | null)[] | null | undefined) =>
    new Set((rows ?? []).flatMap((row) => (row ? [row.id] : [])))

  const ownRules = ownIds(option?.rules)
  const foreignRule = ruleIds.find((id) => !ownRules.has(id))
  if (foreignRule) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option rule with id: ${foreignRule} was not found`
    )
  }

  const ownPrices = ownIds(option?.prices)
  const foreignPrice = priceIds.find((id) => !ownPrices.has(id))
  if (foreignPrice) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option price with id: ${foreignPrice} was not found`
    )
  }
}

export const validateSellerShippingOption = async (
  scope: MedusaContainer,
  sellerId: string,
  shippingOptionId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [sellerShippingOption],
  } = await query.graph({
    entity: "shipping_option_seller",
    filters: {
      seller_id: sellerId,
      shipping_option_id: shippingOptionId,
    },
    fields: ["seller_id"],
  })

  if (!sellerShippingOption) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option with id: ${shippingOptionId} was not found`
    )
  }
}

export const refetchShippingOption = async (
  scope: MedusaContainer,
  shippingOptionId: string,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [shippingOption],
  } = await query.graph({
    entity: "shipping_option",
    filters: { id: shippingOptionId },
    fields,
  })

  return shippingOption
}

export const refetchBatchRules = async (
  batchResult: BatchMethodResponse<ShippingOptionRuleDTO>,
  scope: MedusaContainer,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  let created = Promise.resolve<ShippingOptionRuleDTO[]>([])
  let updated = Promise.resolve<ShippingOptionRuleDTO[]>([])

  if (batchResult.created.length) {
    created = query
      .graph({
        entity: "shipping_option_rule",
        filters: { id: batchResult.created.map((p) => p.id) },
        fields,
      })
      .then(({ data }) => data)
  }

  if (batchResult.updated.length) {
    updated = query
      .graph({
        entity: "shipping_option_rule",
        filters: { id: batchResult.updated.map((p) => p.id) },
        fields,
      })
      .then(({ data }) => data)
  }

  const [createdRes, updatedRes] = await promiseAll([created, updated])
  return {
    created: createdRes,
    updated: updatedRes,
    deleted: {
      ids: batchResult.deleted,
      object: "shipping_option_rule" as const,
      deleted: true,
    },
  }
}
