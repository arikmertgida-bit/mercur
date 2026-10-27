import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

import { PRODUCT_REPORT_STATUSES } from "../../../modules/product-reports/constants"

const AdminProductReportsParamsFields = z.object({
  status: z.enum(PRODUCT_REPORT_STATUSES).optional(),
})

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type AdminGetProductReportsParamsType = Partial<z.infer<typeof AdminGetProductReportsParams>>
export const AdminGetProductReportsParams = createFindParams({
  offset: 0,
  limit: 20,
}).merge(AdminProductReportsParamsFields)

export type AdminUpdateProductReportType = z.infer<
  typeof AdminUpdateProductReport
>
export const AdminUpdateProductReport = z.object({
  status: z.enum(PRODUCT_REPORT_STATUSES),
})
