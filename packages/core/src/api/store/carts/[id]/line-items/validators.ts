import { z } from "zod"
import { JsonRecordSchema } from "../../../../../utils/json-schema"

export const StoreAddCartLineItem = z
  .object({
    variant_id: z.string().min(1, "variant_id is required"),
    quantity: z.number().int().positive(),
    metadata: JsonRecordSchema.optional(),
    additional_data: JsonRecordSchema.optional(),
  })
  .strict()

export type StoreAddCartLineItemType = z.infer<typeof StoreAddCartLineItem>
