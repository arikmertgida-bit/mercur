import { Modules } from "@medusajs/framework/utils";
import type { LinkDefinition } from "@medusajs/framework/types";
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  createRemoteLinkStep,
} from "@medusajs/medusa/core-flows";

import { CreateReviewDTO, REVIEW_MODULE } from "../../../modules/reviews";
const SELLER_MODULE = "seller";

import { createReviewStep, resolveReviewSellerIdsStep, validateReviewStep } from "../steps";

export const createReviewWorkflow = createWorkflow(
  {
    name: "create-review",
  },
  function (input: CreateReviewDTO) {
    validateReviewStep(input);
    const review = createReviewStep(input);
    const sellerIds = resolveReviewSellerIdsStep(input);

    const link = transform({ input, review, sellerIds }, ({ input, review, sellerIds }) => {
      const links: LinkDefinition[] = [];

      if (input.reference === "product") {
        links.push({
          [Modules.PRODUCT]: {
            product_id: input.reference_id,
          },
          [REVIEW_MODULE]: {
            review_id: review.id,
          },
        });
      }

      for (const sellerId of sellerIds) {
        links.push({
          [SELLER_MODULE]: {
            seller_id: sellerId,
          },
          [REVIEW_MODULE]: {
            review_id: review.id,
          },
        });
      }

      return links;
    });

    createRemoteLinkStep(link);

    return new WorkflowResponse({ review, sellerIds });
  }
);
