import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Query } from "@medusajs/framework";

import customerReview from "../../../links/customer-review";
import {
  CustomerReviewRowSchema,
  CustomerSummarySchema,
  buildCustomerDisplayName,
  extractAvatarUrl,
  parseFirstRow,
  parseRows,
} from "../../../lib/graph-schemas";
import { emitReviewNewReviewEvent } from "../../../lib/review-events";
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images";
import ReviewImageService from "../../../modules/review-images/service";
import { ReviewImageDTO } from "../../../modules/reviews/types";
import { StoreReviewResponse } from "../../../modules/reviews/types";
import { REVIEW_SOCIAL_MODULE } from "../../../modules/review-social";
import ReviewSocialModuleService from "../../../modules/review-social/service";
import { createReviewWorkflow } from "../../../workflows/review/workflows";
import { StoreCreateReviewType, StoreGetReviewsParamsType } from "./validators";

export type StoreCustomerReviewRow = {
  id: string
  reference: "product" | "seller"
  reference_id: string | null
  rating: number
  customer_note: string | null
  seller_note: string | null
  created_at: string | Date
  updated_at: string | Date
  customer: { first_name: string; last_name: string; avatar_url?: string } | null
  seller: {
    id: string
    name: string
    handle: string
    logo: string | null
    members?: Array<{ id: string; first_name?: string | null; last_name?: string | null }>
  } | null
  images: ReviewImageDTO[]
  likes_count: number
  is_liked_by_me: boolean
  reply_status: "waiting_for_reply" | "replied"
}

export type StoreCustomerReviewListResponse = {
  reviews: StoreCustomerReviewRow[]
  count: number
  offset: number
  limit: number
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateReviewType>,
  res: MedusaResponse<StoreReviewResponse>
) => {
  const customerId = req.auth_context.actor_id;

  const { result } = await createReviewWorkflow.run({
    container: req.scope,
    input: {
      ...req.validatedBody,
      customer_id: customerId,
    },
  });

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY);

  const {
    data: [review],
  } = await query.graph({
    entity: "review",
    fields: req.queryConfig.fields,
    filters: {
      id: result.review.id,
    },
  });

  if (result.sellerIds.length > 0) {
    const { data: customers } = await query.graph({
      entity: "customer",
      filters: { id: customerId },
      fields: ["id", "first_name", "last_name", "email"],
    });
    const customer = parseFirstRow(CustomerSummarySchema, customers);
    const customerName = customer ? buildCustomerDisplayName(customer) : "Müşteri";

    await Promise.all(
      result.sellerIds.map((sellerId: string) =>
        emitReviewNewReviewEvent(req.scope, {
          sellerToNotify: sellerId,
          customerId,
          customerName,
        })
      )
    );
  }

  res.status(201).json({ review });
};

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetReviewsParamsType>,
  res: MedusaResponse<StoreCustomerReviewListResponse>
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY);
  const customerId = req.auth_context.actor_id;

  const { data: relations, metadata } = await query.graph({
    entity: customerReview.entryPoint,
    fields: req.queryConfig.fields.map((field) => `review.${field}`),
    filters: {
      customer_id: customerId,
    },
    pagination: req.queryConfig.pagination,
  });

  // A customer_review link row can outlive the review it points to (e.g.
  // an admin-deleted review whose link rows predate the cascade cleanup
  // in deleteReviewStep) — `relation.review` resolves to null in that
  // case. parseRows drops any row failing schema validation, which also
  // covers this case, instead of poisoning the whole response.
  const reviews = parseRows(
    CustomerReviewRowSchema,
    relations
      .map((relation) => relation.review)
      .filter((review) => review != null)
  );

  const reviewIds = reviews.map((review) => review.id);

  // `images`, `likes_count`, `is_liked_by_me` and `reply_status` have no
  // module link back to `review` — they live in the review-images and
  // review-social modules, keyed only by a plain `review_id` column, so
  // they can never be resolved through query.graph field selection and
  // must be fetched and merged in explicitly (mirrors /store/product-reviews).
  const imagesByReview: Record<string, ReviewImageDTO[]> = {};
  let likesCountByReview: Record<string, number> = {};
  let likedByMe = new Set<string>();

  if (reviewIds.length > 0) {
    const reviewImageService =
      req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE);
    const images = await reviewImageService.listReviewImages({
      review_id: reviewIds,
      is_hidden: false,
    });
    for (const image of images) {
      const list = imagesByReview[image.review_id] ?? [];
      list.push({ id: image.id, url: image.url, is_hidden: image.is_hidden });
      imagesByReview[image.review_id] = list;
    }

    const reviewSocialService =
      req.scope.resolve<ReviewSocialModuleService>(REVIEW_SOCIAL_MODULE);
    const likesInfo = await reviewSocialService.getReviewLikesInfo(
      reviewIds,
      customerId
    );
    likesCountByReview = likesInfo.likesCountByReview;
    likedByMe = likesInfo.likedByMe;
  }

  res.json({
    reviews: reviews.map((review) => ({
      id: review.id,
      reference: review.reference,
      reference_id: review.reference_id ?? null,
      rating: review.rating,
      customer_note: review.customer_note ?? null,
      seller_note: review.seller_note ?? null,
      created_at: review.created_at,
      updated_at: review.updated_at,
      customer: review.customer
        ? {
            first_name: review.customer.first_name ?? "",
            last_name: review.customer.last_name ?? "",
            avatar_url: extractAvatarUrl(review.customer.metadata),
          }
        : null,
      seller: review.seller
        ? {
            id: review.seller.id,
            name: review.seller.name,
            handle: review.seller.handle,
            logo: review.seller.logo ?? null,
            members: review.seller.members,
          }
        : null,
      images: imagesByReview[review.id] ?? [],
      likes_count: likesCountByReview[review.id] ?? 0,
      is_liked_by_me: likedByMe.has(review.id),
      reply_status: review.seller_note ? "replied" : "waiting_for_reply",
    })),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  });
};
