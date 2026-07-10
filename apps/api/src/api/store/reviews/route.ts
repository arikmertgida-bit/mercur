import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Query } from "@medusajs/framework";

import customerReview from "../../../links/customer-review";
import {
  CustomerSummarySchema,
  ProductSellerIdsRowSchema,
  buildCustomerDisplayName,
  parseFirstRow,
} from "../../../lib/graph-schemas";
import { emitReviewNewReviewEvent } from "../../../lib/review-events";
import { StoreReviewListResponse, StoreReviewResponse } from "../../../modules/reviews/types";
import { createReviewWorkflow } from "../../../workflows/review/workflows";
import { StoreCreateReviewType, StoreGetReviewsParamsType } from "./validators";

async function resolveProductSellerIds(
  query: Query,
  productId: string
): Promise<string[]> {
  const { data } = await query.graph({
    entity: "product",
    filters: { id: productId },
    fields: ["id", "sellers.id"],
  });
  const row = parseFirstRow(ProductSellerIdsRowSchema, data);
  return row?.sellers?.map((seller) => seller.id) ?? [];
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
      id: result.id,
    },
  });

  const sellerIds =
    req.validatedBody.reference === "seller"
      ? [req.validatedBody.reference_id]
      : await resolveProductSellerIds(query, req.validatedBody.reference_id);

  if (sellerIds.length > 0) {
    const { data: customers } = await query.graph({
      entity: "customer",
      filters: { id: customerId },
      fields: ["id", "first_name", "last_name", "email"],
    });
    const customer = parseFirstRow(CustomerSummarySchema, customers);
    const customerName = customer ? buildCustomerDisplayName(customer) : "Müşteri";

    await Promise.all(
      sellerIds.map((sellerId) =>
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
    reviews: reviews.map((relation) => relation.review),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  });
};
