import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { StoreGetProductPromotionsParams } from "./validators"

export const storeProductPromotionsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/products/:id/promotions",
    middlewares: [
      validateAndTransformQuery(StoreGetProductPromotionsParams, {
        defaults: [],
        isList: false,
      }),
    ],
  },
]
