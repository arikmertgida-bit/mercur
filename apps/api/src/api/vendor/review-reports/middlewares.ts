import { MiddlewareRoute } from "@medusajs/framework/http";
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";

import { vendorReviewReportQueryConfig } from "./query-config";
import {
  VendorCreateReviewReport,
  VendorGetReviewReportsParams,
} from "./validators";

export const vendorReviewReportsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/review-reports",
    middlewares: [
      validateAndTransformQuery(
        VendorGetReviewReportsParams,
        vendorReviewReportQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/review-reports",
    middlewares: [validateAndTransformBody(VendorCreateReviewReport)],
  },
];
