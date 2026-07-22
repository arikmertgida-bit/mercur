import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep } from "@medusajs/framework/workflows-sdk";
import type { Query } from "@medusajs/framework";
import { z } from "zod";

import { CreateReviewDTO } from "../../../modules/reviews";
import orderReview from "../../../links/order-review";
import customerReview from "../../../links/customer-review";
import { CustomerSummarySchema, parseFirstRow } from "../../../lib/graph-schemas";
import { isReviewBypassEmail } from "../../../lib/review-bypass";

const ReferencedReviewRowSchema = z.object({
  reference: z.enum(["product", "seller"]),
  product: z.object({ id: z.string() }).nullable().optional(),
  seller: z.object({ id: z.string() }).nullable().optional(),
});

function isDuplicateReference(
  rows: Array<z.infer<typeof ReferencedReviewRowSchema>>,
  reviewToCreate: CreateReviewDTO
): boolean {
  return rows.some((row) => {
    if (row.reference !== reviewToCreate.reference) {
      return false;
    }
    const existingReferenceId =
      row.reference === "product" ? row.product?.id : row.seller?.id;
    return existingReferenceId === reviewToCreate.reference_id;
  });
}

async function validateOrderBoundReview(
  query: Query,
  orderId: string,
  reviewToCreate: CreateReviewDTO
): Promise<void> {
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: {
      id: orderId,
      customer_id: reviewToCreate.customer_id,
    },
  });

  if (!order) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "orderNotFound");
  }

  const { data } = await query.graph({
    entity: orderReview.entryPoint,
    fields: ["review.reference", "review.product.id", "review.seller.id"],
    filters: {
      order_id: orderId,
    },
  });

  const rows = data.flatMap((relation) => {
    const parsed = ReferencedReviewRowSchema.safeParse(relation.review);
    return parsed.success ? [parsed.data] : [];
  });

  if (isDuplicateReference(rows, reviewToCreate)) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "duplicateOrderReview"
    );
  }
}

async function validateBypassReview(
  query: Query,
  reviewToCreate: CreateReviewDTO
): Promise<void> {
  const { data: customers } = await query.graph({
    entity: "customer",
    filters: { id: reviewToCreate.customer_id },
    fields: ["id", "first_name", "last_name", "email"],
  });
  const customer = parseFirstRow(CustomerSummarySchema, customers);

  if (!customer || !isReviewBypassEmail(customer.email)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "orderSelectRequired");
  }

  const { data } = await query.graph({
    entity: customerReview.entryPoint,
    fields: ["review.reference", "review.product.id", "review.seller.id"],
    filters: {
      customer_id: reviewToCreate.customer_id,
    },
  });

  const rows = data.flatMap((relation) => {
    const parsed = ReferencedReviewRowSchema.safeParse(relation.review);
    return parsed.success ? [parsed.data] : [];
  });

  if (isDuplicateReference(rows, reviewToCreate)) {
    throw new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "duplicateReview");
  }
}

export const validateReviewStep = createStep(
  "validate-review",
  async (reviewToCreate: CreateReviewDTO, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);

    if (reviewToCreate.order_id) {
      await validateOrderBoundReview(query, reviewToCreate.order_id, reviewToCreate);
    } else {
      await validateBypassReview(query, reviewToCreate);
    }
  }
);
