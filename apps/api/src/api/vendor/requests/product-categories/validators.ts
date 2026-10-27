import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { RequestStatus } from "../../../../types/requests"
import { JsonRecordSchema } from "../../../../lib/graph-schemas"

export type VendorCreateProductCategoryRequestType = z.infer<typeof VendorCreateProductCategoryRequest>
export const VendorCreateProductCategoryRequest = z.object({
  name: z.string(),
  handle: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  is_internal: z.boolean().optional(),
  parent_category_id: z.string().nullish(),
  metadata: JsonRecordSchema.optional(),
})

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type VendorGetProductCategoryRequestsParamsType = Partial<z.infer<typeof VendorGetProductCategoryRequestsParams>>
export const VendorGetProductCategoryRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  q: z.string().optional(),
  request_status: z
    .union([z.nativeEnum(RequestStatus), z.array(z.nativeEnum(RequestStatus))])
    .optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})
