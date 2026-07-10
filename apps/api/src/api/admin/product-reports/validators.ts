import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

const AdminProductReportsParamsFields = z.object({
  status: z.enum(["pending", "resolved", "dismissed"]).optional(),
})

export type AdminGetProductReportsParamsType = z.infer<
  typeof AdminGetProductReportsParams
>
export const AdminGetProductReportsParams = createFindParams({
  offset: 0,
  limit: 20,
}).merge(AdminProductReportsParamsFields)

export type AdminUpdateProductReportType = z.infer<
  typeof AdminUpdateProductReport
>
export const AdminUpdateProductReport = z.object({
  status: z.enum(["pending", "resolved", "dismissed"]),
})
