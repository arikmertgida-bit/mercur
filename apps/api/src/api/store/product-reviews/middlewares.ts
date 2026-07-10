import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { storeProductReviewQueryConfig } from "./query-config"
import { StoreGetProductReviewsParams } from "./validators"

export const storeProductReviewsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/product-reviews",
    middlewares: [
      validateAndTransformQuery(
        StoreGetProductReviewsParams,
        storeProductReviewQueryConfig.list
      ),
    ],
  },
]
