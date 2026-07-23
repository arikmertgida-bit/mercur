import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { vendorFollowersQueryConfig } from "./query-config"
import { VendorGetFollowersParams } from "./validators"

export const vendorFollowersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/followers",
    middlewares: [
      validateAndTransformQuery(
        VendorGetFollowersParams,
        vendorFollowersQueryConfig.list
      ),
    ],
  },
]
