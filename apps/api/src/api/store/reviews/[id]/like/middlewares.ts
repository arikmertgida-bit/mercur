import { authenticate } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

export const storeReviewLikeMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/reviews/:id/like",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
]
