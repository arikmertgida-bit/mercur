import { authenticate, validateAndTransformQuery } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { storeFollowedSellersQueryConfig } from "./query-config"
import { StoreGetFollowedSellersParams } from "./validators"

export const storeSellersFollowingMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/sellers-following",
    middlewares: [
      authenticate("customer", ["bearer", "session"]),
      validateAndTransformQuery(
        StoreGetFollowedSellersParams,
        storeFollowedSellersQueryConfig.list
      ),
    ],
  },
]
