import { MiddlewareRoute } from "@medusajs/framework/http"
import { authenticate, validateAndTransformBody } from "@medusajs/framework"

import { reportRateLimiter } from "../../../lib/rate-limit"
import { StoreReportProduct } from "./validators"

export const storeProductReportsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/product-reports/:id/report",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      reportRateLimiter,
      validateAndTransformBody(StoreReportProduct),
    ],
  },
]
