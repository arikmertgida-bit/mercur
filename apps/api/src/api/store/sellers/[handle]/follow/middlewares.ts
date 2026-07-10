import { authenticate } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

export const storeSellerFollowMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET", "POST", "DELETE"],
    matcher: "/store/sellers/:handle/follow",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
]
