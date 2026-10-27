import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

/**
 * Medusa types an order change action's `details` as an untyped record; the
 * entries the dashboard reads are validated here, each one independently so
 * an unexpected value only drops that entry.
 */
const OrderChangeActionDetailsSchema = z.object({
  reason_id: z.string().nullish().catch(undefined),
  quantity: z.number().nullish().catch(undefined),
  quantity_diff: z.number().nullish().catch(undefined),
  reference_id: z.string().nullish().catch(undefined),
})

export type OrderChangeActionDetails = z.infer<
  typeof OrderChangeActionDetailsSchema
>

export const getOrderChangeActionDetails = (
  action?: Pick<HttpTypes.AdminOrderChangeAction, "details"> | null
): OrderChangeActionDetails => {
  const parsed = OrderChangeActionDetailsSchema.safeParse(action?.details ?? {})

  return parsed.success ? parsed.data : {}
}

/**
 * The action's `amount` is sent by the backend but is not part of Medusa's
 * HTTP action type, so it is read through a schema.
 */
const OrderChangeActionAmountSchema = z.object({
  amount: z.union([z.number(), z.string()]).nullish().catch(undefined),
})

export const getOrderChangeActionAmount = (
  action?: HttpTypes.AdminOrderChangeAction | null
): number => {
  const parsed = OrderChangeActionAmountSchema.safeParse(action ?? {})

  return parsed.success ? Number(parsed.data.amount || 0) : 0
}

const ChangedAddressSchema = z.object({
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  company: z.string().nullish(),
  address_1: z.string().nullish(),
  address_2: z.string().nullish(),
  city: z.string().nullish(),
  postal_code: z.string().nullish(),
  province: z.string().nullish(),
  country_code: z.string().nullish(),
  country: z.object({ display_name: z.string().nullish() }).nullish(),
})

export type ChangedAddress = z.infer<typeof ChangedAddressSchema>

const ChangedValueSchema = z
  .union([z.string(), ChangedAddressSchema])
  .nullish()
  .catch(undefined)

/**
 * The `details` of an `update_order` action: which field changed and its
 * previous and next value (an address, or the email text).
 */
const OrderUpdateDetailsSchema = z.object({
  type: z.string().nullish().catch(undefined),
  old: ChangedValueSchema,
  new: ChangedValueSchema,
})

export type OrderUpdateDetails = z.infer<typeof OrderUpdateDetailsSchema>

export const getOrderUpdateDetails = (
  action?: Pick<HttpTypes.AdminOrderChangeAction, "details"> | null
): OrderUpdateDetails => {
  const parsed = OrderUpdateDetailsSchema.safeParse(action?.details ?? {})

  return parsed.success ? parsed.data : {}
}

export const getChangedAddress = (
  value: OrderUpdateDetails["old"]
): ChangedAddress | null => (value && typeof value === "object" ? value : null)

export const getChangedText = (value: OrderUpdateDetails["old"]): string | null =>
  typeof value === "string" ? value : null
