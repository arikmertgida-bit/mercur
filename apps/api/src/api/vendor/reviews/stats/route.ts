import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import type { Query } from "@medusajs/framework";
import type {} from "@mercurjs/core/types/seller-context";

import { resolveVisibleReviewIds } from "../middlewares";

export type VendorReviewStatsResponse = {
  average_rating: number | null;
  review_count: number;
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorReviewStatsResponse>
): Promise<void> => {
  const sellerId = req.seller_context?.seller_id;
  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    );
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY);
  const reviewIds = await resolveVisibleReviewIds(query, sellerId);

  if (reviewIds.length === 0) {
    res.json({ average_rating: null, review_count: 0 });
    return;
  }

  const { data: reviews } = await query.graph({
    entity: "review",
    fields: ["id", "rating"],
    filters: { id: reviewIds },
  });

  const ratings = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number");

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null;

  res.json({
    average_rating: averageRating,
    review_count: ratings.length,
  });
};
