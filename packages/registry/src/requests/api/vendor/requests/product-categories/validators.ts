import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import { isValidHandle } from "@medusajs/framework/utils"
import { JsonRecordSchema } from "@mercurjs/core/utils/json-schema"

import { RequestStatusFilterSchema } from "../../../../types"

export type VendorCreateProductCategoryRequestType = z.infer<typeof VendorCreateProductCategoryRequest>
export const VendorCreateProductCategoryRequest = z.object({
  name: z.string(),
  handle: z
    .string()
    .optional()
    .refine((value) => !value || isValidHandle(value), {
      message: "Handle must contain URL safe characters",
    }),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  is_internal: z.boolean().optional(),
  parent_category_id: z.string().nullish(),
  metadata: JsonRecordSchema.optional(),
})

// Client-facing contract: every query param is optional on the wire
// (`createFindParams` defaults offset/limit server-side), while zod marks
// defaulted keys as required in the parsed output type.
export type VendorGetProductCategoryRequestsParamsType = Partial<z.infer<typeof VendorGetProductCategoryRequestsParams>>
export const VendorGetProductCategoryRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  q: z.string().optional(),
  request_status: RequestStatusFilterSchema.optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
})
