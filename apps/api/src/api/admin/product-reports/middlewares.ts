import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework"

import { adminProductReportQueryConfig } from "./query-config"
import {
  AdminGetProductReportsParams,
  AdminUpdateProductReport,
} from "./validators"

export const adminProductReportsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/product-reports",
    middlewares: [
      validateAndTransformQuery(
        AdminGetProductReportsParams,
        adminProductReportQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/product-reports/:id",
    middlewares: [validateAndTransformBody(AdminUpdateProductReport)],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/product-reports/:id",
    middlewares: [],
  },
]
