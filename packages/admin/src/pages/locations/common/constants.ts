import { z } from "zod"

export const FulfillmentSetType = {
  Shipping: "shipping",
  Pickup: "pickup",
} as const

export type FulfillmentSetType =
  (typeof FulfillmentSetType)[keyof typeof FulfillmentSetType]

/**
 * Fulfillment set types arrive from the API as plain strings; anything that
 * is not a pickup set is managed as a shipping set.
 */
export const toFulfillmentSetType = (
  type: string | null | undefined
): FulfillmentSetType =>
  type === FulfillmentSetType.Pickup
    ? FulfillmentSetType.Pickup
    : FulfillmentSetType.Shipping

export const ShippingOptionPriceType = {
  FlatRate: "flat",
  Calculated: "calculated",
} as const

export type ShippingOptionPriceType =
  (typeof ShippingOptionPriceType)[keyof typeof ShippingOptionPriceType]

export const ShippingOptionPriceTypeSchema = z.enum(ShippingOptionPriceType)

export const GEO_ZONE_STACKED_MODAL_ID = "geo-zone"

export const CONDITIONAL_PRICES_STACKED_MODAL_ID = "conditional-prices"

export const ITEM_TOTAL_ATTRIBUTE = "item_total"
export const REGION_ID_ATTRIBUTE = "region_id"
