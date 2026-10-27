import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { JsonRecordSchema } from "@mercurjs/core/utils/json-schema"

import { RequestStatusFilterSchema } from "../../../../types"

export type VendorCreateProductTypeRequestType = z.infer<typeof VendorCreateProductTypeRequest>
export const VendorCreateProductTypeRequest = z.object({
  value: z.string(),
  metadata: JsonRecordSchema.optional(),
})

// Client-facing contract: every query param is optional on the wire
// (`createFindParams` defaults offset/limit server-side), while zod marks
// defaulted keys as required in the parsed output type.
export type VendorGetProductTypeRequestsParamsType = Partial<z.infer<typeof VendorGetProductTypeRequestsParams>>
export const VendorGetProductTypeRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  q: z.string().optional(),
  request_status: RequestStatusFilterSchema.optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})
