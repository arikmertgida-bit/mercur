import { ConditionalShippingOptionPriceAccessor } from "../types"

export const getCustomShippingOptionPriceFieldName = (
  field: string,
  type: "region" | "currency"
): ConditionalShippingOptionPriceAccessor => {
  const prefix = type === "region" ? "region_prices." : "currency_prices."
  const key = field.startsWith(prefix) ? field.slice(prefix.length) : field

  return type === "region"
    ? `conditional_region_prices.${key}`
    : `conditional_currency_prices.${key}`
}
