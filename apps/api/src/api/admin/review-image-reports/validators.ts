import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

const AdminReviewImageReportsParamsFields = z.object({
  status: z.enum(["pending", "resolved"]).optional(),
})

export type AdminGetReviewImageReportsParamsType = z.infer<
  typeof AdminGetReviewImageReportsParams
>
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
