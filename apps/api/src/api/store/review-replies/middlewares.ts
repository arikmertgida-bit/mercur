import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import {
  StoreCreateReviewReply,
  StoreGetReviewRepliesParams,
  StoreUpdateReviewReply,
} from "./validators"

export const storeReviewRepliesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/review-replies",
    middlewares: [
      authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
      validateAndTransformQuery(StoreGetReviewRepliesParams, {}),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/review-replies",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreCreateReviewReply),
    ],
  },
  {
    method: ["PUT"],
    matcher: "/store/review-replies/:id",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreUpdateReviewReply),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/store/review-replies/:id",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    method: ["POST"],
    matcher: "/store/review-replies/:id/like",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
]
