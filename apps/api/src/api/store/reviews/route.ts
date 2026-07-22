import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Query } from "@medusajs/framework";

import customerReview from "../../../links/customer-review";
import {
  CustomerSummarySchema,
  buildCustomerDisplayName,
  parseFirstRow,
} from "../../../lib/graph-schemas";
import { emitReviewNewReviewEvent } from "../../../lib/review-events";
import { StoreReviewListResponse, StoreReviewResponse } from "../../../modules/reviews/types";
import { createReviewWorkflow } from "../../../workflows/review/workflows";
import { StoreCreateReviewType, StoreGetReviewsParamsType } from "./validators";

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
  res: MedusaResponse<StoreReviewListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: reviews, metadata } = await query.graph({
    entity: customerReview.entryPoint,
    fields: req.queryConfig.fields.map((field) => `review.${field}`),
    filters: {
      customer_id: req.auth_context.actor_id,
    },
    pagination: req.queryConfig.pagination,
  });

  res.json({
    // A customer_review link row can outlive the review it points to (e.g.
    // an admin-deleted review whose link rows predate the cascade cleanup
    // in deleteReviewStep) — `relation.review` resolves to null in that
    // case. Without filtering, a single stale link poisons the whole
    // response's Zod parse on the storefront, hiding every review the
    // customer ever wrote instead of just the missing one.
    reviews: reviews
      .map((relation) => relation.review)
      .filter((review) => review != null),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  });
};
