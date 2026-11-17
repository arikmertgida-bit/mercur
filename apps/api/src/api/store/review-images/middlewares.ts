import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import { reportRateLimiter } from "../../../lib/rate-limit"
import {
  StoreCreateReviewImages,
  StoreGetReviewImages,
  StoreReportReviewImage,
} from "./validators"

export const storeReviewImagesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/review-images",
    middlewares: [validateAndTransformQuery(StoreGetReviewImages, {})],
  },
  {
    method: ["POST"],
    matcher: "/store/review-images",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreCreateReviewImages),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/review-images/:id/report",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      reportRateLimiter,
      validateAndTransformBody(StoreReportReviewImage),
    ],
  },
]
