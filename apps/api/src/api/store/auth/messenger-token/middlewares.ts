import { authenticate, MiddlewareRoute } from "@medusajs/medusa"

export const storeMessengerTokenMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/auth/messenger-token",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
]
