import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"

import { StoreCreateReviewImages, StoreReportReviewImage } from "./validators"

export const storeReviewImagesMiddlewares: MiddlewareRoute[] = [
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
