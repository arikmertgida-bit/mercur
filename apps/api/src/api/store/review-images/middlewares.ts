import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework"

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
    middlewares: [validateAndTransformBody(StoreCreateReviewImages)],
  },
  {
    method: ["POST"],
    matcher: "/store/review-images/:id/report",
    middlewares: [validateAndTransformBody(StoreReportReviewImage)],
  },
]
