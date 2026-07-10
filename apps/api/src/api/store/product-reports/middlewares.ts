import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"

import { StoreReportProduct } from "./validators"

export const storeProductReportsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/product-reports/:id/report",
    middlewares: [validateAndTransformBody(StoreReportProduct)],
  },
]
