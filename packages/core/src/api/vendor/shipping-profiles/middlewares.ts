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

import { vendorShippingProfileQueryConfig } from "./query-config"
import {
  VendorCreateShippingProfile,
  VendorGetShippingProfileParams,
  VendorGetShippingProfilesParams,
  VendorUpdateShippingProfile,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

const applySellerShippingProfileLinkFilter = (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  req.filterableFields.seller_id = getSellerId(req)

  return maybeApplyLinkFilter({
    entryPoint: "shipping_profile_seller",
    resourceId: "shipping_profile_id",
    filterableField: "seller_id",
  })(req, res, next)
}

export const vendorShippingProfilesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/shipping-profiles",
    middlewares: [
      requirePermission("shipping_profiles", "view"),
      validateAndTransformQuery(
        VendorGetShippingProfilesParams,
        vendorShippingProfileQueryConfig.list
      ),
      applySellerShippingProfileLinkFilter,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/shipping-profiles",
    middlewares: [
      requirePermission("shipping_profiles", "edit"),
      validateAndTransformBody(VendorCreateShippingProfile),
      validateAndTransformQuery(
        VendorGetShippingProfileParams,
        vendorShippingProfileQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/vendor/shipping-profiles/:id",
    middlewares: [
      requirePermission("shipping_profiles", "view"),
      validateAndTransformQuery(
        VendorGetShippingProfileParams,
        vendorShippingProfileQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/shipping-profiles/:id",
    middlewares: [
      requirePermission("shipping_profiles", "edit"),
      validateAndTransformBody(VendorUpdateShippingProfile),
      validateAndTransformQuery(
        VendorGetShippingProfileParams,
        vendorShippingProfileQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/shipping-profiles/:id",
    middlewares: [requirePermission("shipping_profiles", "manage")],
  },
]
