import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { RequestStatus } from "../../../types/requests"

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type AdminGetRequestsParamsType = Partial<z.infer<typeof AdminGetRequestsParams>>
export const AdminGetRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  request_status: z
    .union([z.nativeEnum(RequestStatus), z.array(z.nativeEnum(RequestStatus))])
    .optional(),
  submitter_id: z.union([z.string(), z.array(z.string())]).optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})

export type AdminReviewNoteType = z.infer<typeof AdminReviewNote>
export const AdminReviewNote = z.object({
  reviewer_note: z.string().optional(),
})
