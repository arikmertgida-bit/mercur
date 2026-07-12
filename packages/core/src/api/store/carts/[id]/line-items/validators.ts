import { z } from "zod"

export const StoreAddCartLineItem = z
  .object({
    variant_id: z.string().min(1, "variant_id is required"),
    quantity: z.number().int().positive(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    additional_data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type StoreAddCartLineItemType = z.infer<typeof StoreAddCartLineItem>
