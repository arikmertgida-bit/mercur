import { HttpTypes } from "@medusajs/types"
import type { InferClientInput } from "@mercurjs/client"

import { sdk } from "@lib/client"

export function isReturnOption(shippingOption: HttpTypes.AdminShippingOption) {
  return !!shippingOption.rules?.find(
    (r) =>
      r.attribute === "is_return" && r.value === "true" && r.operator === "eq"
  )
}

export function isOptionEnabledInStore(
  shippingOption: HttpTypes.AdminShippingOption
) {
  return !!shippingOption.rules?.find(
    (r) =>
      r.attribute === "enabled_in_store" &&
      r.value === "true" &&
      r.operator === "eq"
  )
}

const IS_RETURN_RULE = "is_return"
const ENABLED_IN_STORE_RULE = "enabled_in_store"
const EQ_OPERATOR = "eq"

type ShippingOptionUpdateInput = InferClientInput<
  typeof sdk.vendor.shippingOptions.$id.mutate
>
type ShippingOptionRuleInput = NonNullable<
  ShippingOptionUpdateInput["rules"]
>[number]
type ShippingOptionRuleOperator = ShippingOptionRuleInput["operator"]
type ShippingOptionPriceTypeInput = NonNullable<
  ShippingOptionUpdateInput["price_type"]
>

// Wire values of Medusa's RuleOperator / ShippingOptionPriceType. The vendor
// API types these fields as TS enums, which this package cannot import, so
// values are narrowed by value.
const RULE_OPERATORS: readonly string[] = [
  "in",
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "nin",
]
const PRICE_TYPES: readonly string[] = ["flat", "calculated"]

const isRuleOperator = (
  operator: string
): operator is ShippingOptionRuleOperator => RULE_OPERATORS.includes(operator)

const isShippingOptionPriceType = (
  priceType: string
): priceType is ShippingOptionPriceTypeInput => PRICE_TYPES.includes(priceType)

export const toShippingOptionPriceType = (
  priceType: string
): ShippingOptionPriceTypeInput | undefined =>
  isShippingOptionPriceType(priceType) ? priceType : undefined

const eqRule = (attribute: string, value: string): ShippingOptionRuleInput[] => {
  const operator: string = EQ_OPERATOR
  return isRuleOperator(operator) ? [{ attribute, operator, value }] : []
}

// The update replaces the option's whole rule set, so existing rules are sent
// back unchanged. An option without the `is_return` / `enabled_in_store`
// rules matches every storefront context (it was listed as a return option
// too), so the missing ones are added with the values the panel shows.
export function buildShippingOptionRules(
  shippingOption: Pick<HttpTypes.AdminShippingOption, "rules">,
  enabledInStore: boolean
): ShippingOptionRuleInput[] {
  const storeValue = enabledInStore ? "true" : "false"

  const rules: ShippingOptionRuleInput[] = (shippingOption.rules ?? []).flatMap(
    (r) => {
      const operator: string = r.operator
      if (!isRuleOperator(operator)) {
        return []
      }

      return [
        {
          id: r.id,
          attribute: r.attribute,
          operator,
          value:
            r.attribute === ENABLED_IN_STORE_RULE ? storeValue : r.value ?? "",
        },
      ]
    }
  )

  if (!rules.some((r) => r.attribute === ENABLED_IN_STORE_RULE)) {
    rules.push(...eqRule(ENABLED_IN_STORE_RULE, storeValue))
  }

  if (!rules.some((r) => r.attribute === IS_RETURN_RULE)) {
    rules.push(...eqRule(IS_RETURN_RULE, "false"))
  }

  return rules
}

/**
 * Return a name for the shipping option location or generate one based on the locations address
 */
export function getShippingProfileName(name: string) {
  return name.split(":")[1]
}

export function isSameLocation(
  shippingOption: HttpTypes.AdminShippingOption,
  locationId: string
) {
  return (
    shippingOption?.service_zone?.fulfillment_set?.location?.id === locationId
  )
}

export function getFormattedShippingOptionLocationName(
  shippingOption: HttpTypes.AdminShippingOption
) {
  const location = shippingOption.service_zone.fulfillment_set.location

  if (!location) {
    return "N/A"
  }

  if (location.name) {
    return `${location.name}`
  }

  let name = ""

  if (location.address) {
    if (location.address.address_1) {
      name += `${location.address.address_1}`
    }

    if (location.address.address_2) {
      name += `${location.address.address_2}`
    }

    if (location.address.city) {
      name += `${location.address.city}`
    }

    if (location.address.postal_code) {
      name += `${location.address.postal_code}`
    }

    if (location.address.country_code) {
      name += `, ${location.address.country_code}`
    }
  }

  return name || "N/A"
}
