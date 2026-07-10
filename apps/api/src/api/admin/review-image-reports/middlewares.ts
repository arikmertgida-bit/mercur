import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework"

import { adminReviewImageReportQueryConfig } from "./query-config"
import {
  AdminGetReviewImageReportsParams,
  AdminResolveReviewImageReport,
} from "./validators"

export const adminReviewImageReportsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/review-image-reports",
    middlewares: [
      validateAndTransformQuery(
        AdminGetReviewImageReportsParams,
        adminReviewImageReportQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/review-image-reports/:id/resolve",
    middlewares: [validateAndTransformBody(AdminResolveReviewImageReport)],
  },
]
