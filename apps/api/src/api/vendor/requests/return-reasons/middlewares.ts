import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import { listTransformQueryConfig, retrieveTransformQueryConfig } from "./query-config"
import {
  VendorCreateReturnReasonRequest,
  VendorGetReturnReasonRequestsParams,
} from "./validators"
import { applyRequestCustomFieldsFilter } from "./helpers"

export const vendorReturnReasonRequestsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/requests/return-reasons",
    middlewares: [
      validateAndTransformQuery(
        VendorGetReturnReasonRequestsParams,
        listTransformQueryConfig
      ),
      applyRequestCustomFieldsFilter(),
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/requests/return-reasons",
    middlewares: [
      validateAndTransformBody(VendorCreateReturnReasonRequest),
      validateAndTransformQuery(
        VendorGetReturnReasonRequestsParams,
        retrieveTransformQueryConfig
      ),
    ],
  },
]
