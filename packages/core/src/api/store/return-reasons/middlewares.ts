import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { listTransformQueryConfig } from "./query-config"
import { StoreReturnReasonsParams } from "./validators"

export const storeReturnReasonsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/return-reasons",
    middlewares: [
      validateAndTransformQuery(StoreReturnReasonsParams, listTransformQueryConfig),
    ],
  },
]
