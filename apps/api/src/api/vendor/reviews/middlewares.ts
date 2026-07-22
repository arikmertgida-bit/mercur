import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http";
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import type { Query } from "@medusajs/framework";
import type {} from "@mercurjs/core/types/seller-context";

import productReview from "../../../links/product-review";
import sellerReview from "../../../links/seller-review";
import { vendorReviewQueryConfig } from "./query-config";
import { VendorGetReviewsParams, VendorUpdateReview } from "./validators";

/**
 * A review is visible to a seller either because it was written directly
 * about them (`seller_review` link) or because it was written about one of
 * their products (`product_review` link, resolved via `product_seller`) —
 * mirrors `validateSellerReview` in ./helpers.ts, which authorizes the same
 * two sources for a single review.
 */
export async function resolveVisibleReviewIds(
  query: Query,
  sellerId: string
): Promise<string[]> {
  const [{ data: directLinks }, { data: productLinks }] = await Promise.all([
    query.graph({
      entity: sellerReview.entryPoint,
      fields: ["review_id"],
      filters: { seller_id: sellerId },
    }),
    query.graph({
      entity: "product_seller",
      fields: ["product_id"],
      filters: { seller_id: sellerId },
    }),
  ]);

  const reviewIds = new Set<string>(directLinks.map((link) => link.review_id));

  const productIds = productLinks
    .map((link) => link.product_id)
    .filter((id): id is string => Boolean(id));

  if (productIds.length > 0) {
    const { data: reviewsForProducts } = await query.graph({
      entity: productReview.entryPoint,
      fields: ["review_id"],
      filters: { product_id: productIds },
    });
    for (const link of reviewsForProducts) {
      reviewIds.add(link.review_id);
    }
  }

  return Array.from(reviewIds);
}

const applySellerReviewIdFilter = async (
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
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

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY);
  const reviewIds = await resolveVisibleReviewIds(
    query,
    req.seller_context.seller_id
  );

  req.filterableFields ??= {};
  const existingAnd = (req.filterableFields.$and as object[] | undefined) ?? [];
  req.filterableFields.$and = [...existingAnd, { id: reviewIds }];

  return next();
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
      applySellerReviewIdFilter,
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
