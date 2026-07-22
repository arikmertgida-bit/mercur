import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import type { Query } from "@medusajs/framework";

import { CreateReviewDTO } from "../../../modules/reviews";
import { ProductSellerIdsRowSchema, parseFirstRow } from "../../../lib/graph-schemas";

/**
 * Resolves which seller(s) a review should be linked to, so seller-scoped
 * review queries (vendor panel, seller aggregate rating) see product
 * reviews too, not only reviews written directly about the seller.
 */
export const resolveReviewSellerIdsStep = createStep(
  "resolve-review-seller-ids",
  async (input: CreateReviewDTO, { container }) => {
    if (input.reference === "seller") {
      return new StepResponse([input.reference_id]);
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);
    const { data: products } = await query.graph({
      entity: "product",
      filters: { id: input.reference_id },
      fields: ["id", "sellers.id"],
    });

    const product = parseFirstRow(ProductSellerIdsRowSchema, products);
    const sellerIds = product?.sellers?.map((seller) => seller.id) ?? [];

    return new StepResponse(sellerIds);
  }
);
