import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { isValidHandle } from "@medusajs/framework/utils"
import { JsonRecordSchema } from "@mercurjs/core/utils/json-schema"

import { RequestStatusFilterSchema } from "../../../../types"

export type VendorCreateProductCollectionRequestType = z.infer<typeof VendorCreateProductCollectionRequest>
export const VendorCreateProductCollectionRequest = z.object({
  title: z.string(),
  handle: z
    .string()
    .optional()
    .refine((value) => !value || isValidHandle(value), {
      message: "Handle must contain URL safe characters",
    }),
  metadata: JsonRecordSchema.optional(),
})

// Client-facing contract: every query param is optional on the wire
// (`createFindParams` defaults offset/limit server-side), while zod marks
// defaulted keys as required in the parsed output type.
export type VendorGetProductCollectionRequestsParamsType = Partial<z.infer<typeof VendorGetProductCollectionRequestsParams>>
export const VendorGetProductCollectionRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  q: z.string().optional(),
  request_status: RequestStatusFilterSchema.optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})
