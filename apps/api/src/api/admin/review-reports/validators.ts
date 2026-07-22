import { z } from "zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";

const AdminReviewReportsParamsFields = z.object({
  status: z.enum(["pending", "resolved_deleted", "resolved_kept"]).optional(),
});

export type AdminGetReviewReportsParamsType = z.infer<
  typeof AdminGetReviewReportsParams
>;
export const AdminGetReviewReportsParams = createFindParams({
  offset: 0,
  limit: 20,
}).merge(AdminReviewReportsParamsFields);

export type AdminResolveReviewReportType = z.infer<
  typeof AdminResolveReviewReport
>;
export const AdminResolveReviewReport = z.object({
  action: z.enum(["delete", "reject"]),
  admin_note: z.string().min(1).max(1000),
});
