import { MiddlewareRoute } from "@medusajs/framework/http"
import { authenticate, validateAndTransformQuery } from "@medusajs/framework"

import { storeProductReviewQueryConfig } from "./query-config"
import { StoreGetProductReviewsParams } from "./validators"

export const storeProductReviewsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/product-reviews",
    middlewares: [
      authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
      validateAndTransformQuery(
        StoreGetProductReviewsParams,
        storeProductReviewQueryConfig.list
      ),
    ],
  },
]
