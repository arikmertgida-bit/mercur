import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import type { Query } from "@medusajs/framework";
import type {} from "@mercurjs/core/types/seller-context";

import { computeAwaitingReplyMap, fetchReviewReplyActivity } from "../../../../lib/review-reply-helpers";
import { resolveVisibleReviewIds } from "../middlewares";

export type VendorReviewStatsResponse = {
  average_rating: number | null;
  review_count: number;
  /**
   * Reviews visible to this seller where the customer side of the thread
   * (the original review, or any later customer `review_reply` message) is
   * more recent than the seller's own last reply — powers the
   * "Değerlendirmeler" sidebar nav badge. Thread-aware on purpose: a
   * customer following up with a new message after an already-answered
   * review must flip this back on, not just the review's very first
   * `seller_note`. Computed from real review/review_reply rows (not a
   * separately-tracked counter) so it self-corrects on every poll/focus
   * refetch and on the instant a reply is saved, with no bulk mark-read step.
   */
  awaiting_reply_count: number;
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
    res.json({ average_rating: null, review_count: 0, awaiting_reply_count: 0 });
    return;
  }

  const { data: reviews } = await query.graph({
    entity: "review",
    fields: ["id", "rating", "created_at"],
    filters: { id: reviewIds },
  });

  const replies = await fetchReviewReplyActivity(req.scope, reviewIds);
  const awaitingReplyByReview = computeAwaitingReplyMap(reviews, replies);

  const ratings = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number");

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null;

  const awaitingReplyCount = reviews.filter(
    (review) => awaitingReplyByReview.get(review.id) ?? false
  ).length;

  res.json({
    average_rating: averageRating,
    review_count: ratings.length,
    awaiting_reply_count: awaitingReplyCount,
  });
};
