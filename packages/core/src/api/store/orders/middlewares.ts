import { authenticate } from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/medusa"

export const storeOrdersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/orders/:id",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/orders/:id/cancel",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
]
