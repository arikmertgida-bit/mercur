import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { RequestStatusFilterSchema } from "../../../types"

// Client-facing contract: every query param is optional on the wire
// (`createFindParams` defaults offset/limit server-side), while zod marks
// defaulted keys as required in the parsed output type.
export type AdminGetRequestsParamsType = Partial<z.infer<typeof AdminGetRequestsParams>>
export const AdminGetRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  request_status: RequestStatusFilterSchema.optional(),
  submitter_id: z.union([z.string(), z.array(z.string())]).optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})

export type AdminReviewNoteType = z.infer<typeof AdminReviewNote>
export const AdminReviewNote = z.object({
  reviewer_note: z.string().optional(),
})
