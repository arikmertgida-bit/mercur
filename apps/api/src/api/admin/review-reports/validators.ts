import { z } from "zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";

const AdminReviewReportsParamsFields = z.object({
  status: z.enum(["pending", "resolved_deleted", "resolved_kept"]).optional(),
});

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type AdminGetReviewReportsParamsType = Partial<z.infer<typeof AdminGetReviewReportsParams>>;
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
