import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

import { REVIEW_IMAGE_REPORT_STATUSES } from "../../../modules/review-image-reports/constants"

const AdminReviewImageReportsParamsFields = z.object({
  status: z.enum(REVIEW_IMAGE_REPORT_STATUSES).optional(),
})

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type AdminGetReviewImageReportsParamsType = Partial<z.infer<typeof AdminGetReviewImageReportsParams>>
export const AdminGetReviewImageReportsParams = createFindParams({
  offset: 0,
  limit: 20,
}).merge(AdminReviewImageReportsParamsFields)

export type AdminResolveReviewImageReportType = z.infer<
  typeof AdminResolveReviewImageReport
>
export const AdminResolveReviewImageReport = z.object({
  action: z.enum(["hide", "publish"]),
})
