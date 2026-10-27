import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { JsonRecordSchema } from "@mercurjs/core/utils/json-schema"

import { RequestStatusFilterSchema } from "../../../../types"

export type VendorCreateProductTagRequestType = z.infer<typeof VendorCreateProductTagRequest>
export const VendorCreateProductTagRequest = z.object({
  value: z.string(),
  metadata: JsonRecordSchema.optional(),
})

// Client-facing contract: every query param is optional on the wire
// (`createFindParams` defaults offset/limit server-side), while zod marks
// defaulted keys as required in the parsed output type.
export type VendorGetProductTagRequestsParamsType = Partial<z.infer<typeof VendorGetProductTagRequestsParams>>
export const VendorGetProductTagRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  q: z.string().optional(),
  request_status: RequestStatusFilterSchema.optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})
