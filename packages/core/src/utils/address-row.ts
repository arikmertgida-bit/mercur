import { z } from "zod"
import { GraphDateSchema } from "./graph-rows"
import { JsonRecordSchema } from "./json-schema"

/**
 * Every column of a cart/order address row (`*_address.*`), so code that
 * copies an address into a new record carries the same values the row holds.
 */
export const AddressRowSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullish(),
  company: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  address_1: z.string().nullish(),
  address_2: z.string().nullish(),
  city: z.string().nullish(),
  country_code: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  phone: z.string().nullish(),
  metadata: JsonRecordSchema.nullish(),
  created_at: GraphDateSchema.nullish(),
  updated_at: GraphDateSchema.nullish(),
  deleted_at: GraphDateSchema.nullish(),
})

export type AddressRow = z.infer<typeof AddressRowSchema>
