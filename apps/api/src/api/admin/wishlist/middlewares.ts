import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { adminWishlistQueryConfig } from "./query-config"
import { AdminGetWishlistsParams } from "./validators"

export const adminWishlistMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/wishlist",
    middlewares: [
      validateAndTransformQuery(AdminGetWishlistsParams, adminWishlistQueryConfig.list),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/wishlist/:id",
    middlewares: [],
  },
]
