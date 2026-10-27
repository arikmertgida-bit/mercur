import { requirePermission } from "../../utils"
import {
  AuthenticatedMedusaRequest,
  maybeApplyLinkFilter,
  MedusaNextFunction,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import { vendorCustomerQueryConfig } from "./query-config"
import {
  VendorGetCustomerParams,
  VendorGetCustomersParams,
  VendorManageCustomerCustomerGroups,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

const applySellerCustomerLinkFilter = (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  req.filterableFields.seller_id = getSellerId(req)

  return maybeApplyLinkFilter({
    entryPoint: "seller_customer",
    resourceId: "customer_id",
    filterableField: "seller_id",
  })(req, res, next)
}

export const vendorCustomersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/customers",
    middlewares: [
      requirePermission("customers", "view"),
      validateAndTransformQuery(
        VendorGetCustomersParams,
        vendorCustomerQueryConfig.list
      ),
      applySellerCustomerLinkFilter,
    ],
  },
  {
    method: ["GET"],
    matcher: "/vendor/customers/:id",
    middlewares: [
      requirePermission("customers", "view"),
      validateAndTransformQuery(
        VendorGetCustomerParams,
        vendorCustomerQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/customers/:id/customer-groups",
    middlewares: [
      requirePermission("customers", "edit"),
      validateAndTransformBody(VendorManageCustomerCustomerGroups),
      validateAndTransformQuery(
        VendorGetCustomerParams,
        vendorCustomerQueryConfig.retrieve
      ),
    ],
  },
]
