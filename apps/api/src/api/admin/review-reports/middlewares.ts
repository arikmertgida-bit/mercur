import { MiddlewareRoute } from "@medusajs/framework/http";
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";

import { adminReviewReportQueryConfig } from "./query-config";
import {
  AdminGetReviewReportsParams,
  AdminResolveReviewReport,
} from "./validators";

export const adminReviewReportsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/review-reports",
    middlewares: [
      validateAndTransformQuery(
        AdminGetReviewReportsParams,
        adminReviewReportQueryConfig.list
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/review-reports/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetReviewReportsParams,
        adminReviewReportQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/review-reports/:id/resolve",
    middlewares: [validateAndTransformBody(AdminResolveReviewReport)],
  },
];
