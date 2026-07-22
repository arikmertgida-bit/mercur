import { z } from "zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";

export type VendorGetReviewReportsParamsType = z.infer<
  typeof VendorGetReviewReportsParams
>;
export const VendorGetReviewReportsParams = createFindParams({
  offset: 0,
  limit: 20,
});

export type VendorCreateReviewReportType = z.infer<
  typeof VendorCreateReviewReport
>;
export const VendorCreateReviewReport = z.object({
  review_id: z.string().min(1),
  reason: z.string().min(1).max(500),
});
