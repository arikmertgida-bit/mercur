import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { RequestStatus } from "../../../../types/requests"

export type VendorCreateReturnReasonRequestType = z.infer<typeof VendorCreateReturnReasonRequest>
export const VendorCreateReturnReasonRequest = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
})

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type VendorGetReturnReasonRequestsParamsType = Partial<z.infer<typeof VendorGetReturnReasonRequestsParams>>
export const VendorGetReturnReasonRequestsParams = createFindParams({
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
