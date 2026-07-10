import {
  AuthenticatedMedusaRequest,
  maybeApplyLinkFilter,
  MedusaNextFunction,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http";
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MedusaError } from "@medusajs/framework/utils";
import type {} from "@mercurjs/core/types/seller-context";

import sellerReview from "../../../links/seller-review";
import { vendorReviewQueryConfig } from "./query-config";
import { VendorGetReviewsParams, VendorUpdateReview } from "./validators";

const applySellerReviewLinkFilter = (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  // req.auth_context.actor_id is the MEMBER id, not the seller id — the
  // real seller id is resolved by ensureSellerMiddleware onto
  // req.seller_context.seller_id (see ensure-seller-middleware.ts).
  if (!req.seller_context?.seller_id) {
    return next(
      new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Authenticated seller not found"
      )
    );
  }

  req.filterableFields.seller_id = req.seller_context.seller_id;

  return maybeApplyLinkFilter({
    entryPoint: sellerReview.entryPoint,
    resourceId: "review_id",
    filterableField: "seller_id",
  })(req, res, next);
};

export const vendorReviewsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/reviews",
    middlewares: [
      validateAndTransformQuery(
        VendorGetReviewsParams,
        vendorReviewQueryConfig.list
      ),
      applySellerReviewLinkFilter,
    ],
  },
  {
    method: ["GET"],
    matcher: "/vendor/reviews/:id",
    middlewares: [
      validateAndTransformQuery(
        VendorGetReviewsParams,
        vendorReviewQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/reviews/:id",
    middlewares: [
      validateAndTransformQuery(
        VendorGetReviewsParams,
        vendorReviewQueryConfig.retrieve
      ),
      validateAndTransformBody(VendorUpdateReview),
    ],
  },
];
