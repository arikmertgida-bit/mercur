import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import type { LinkDefinition } from "@medusajs/framework/types";

import { REVIEW_MODULE, ReviewModuleService, CreateReviewDTO } from "../../../modules/reviews";
import { Link } from "@medusajs/framework/modules-sdk";

type CreateReviewCompensateInput = {
  review_id: string
  customer_id: string
  order_id: string | null
}

export const createReviewStep = createStep(
  "create-review",
  async (input: CreateReviewDTO, { container }) => {
    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK);

    const review = await service.createReviews(input);
    const orderId = input.order_id ?? null;

    const links: LinkDefinition[] = [
      {
        [Modules.CUSTOMER]: {
          customer_id: input.customer_id,
        },
        [REVIEW_MODULE]: {
          review_id: review.id,
        },
      },
    ];

    if (orderId) {
      links.push({
        [Modules.ORDER]: {
          order_id: orderId,
        },
        [REVIEW_MODULE]: {
          review_id: review.id,
        },
      });
    }

    await link.create(links);

    return new StepResponse(review, {
      review_id: review.id,
      customer_id: input.customer_id,
      order_id: orderId,
    });
  },
  async (compensateInput: CreateReviewCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return;
    }

    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK);
    const { review_id, customer_id, order_id } = compensateInput;

    const links: LinkDefinition[] = [
      {
        [Modules.CUSTOMER]: { customer_id },
        [REVIEW_MODULE]: { review_id },
      },
    ];

    if (order_id) {
      links.push({
        [Modules.ORDER]: { order_id },
        [REVIEW_MODULE]: { review_id },
      });
    }

    await link.dismiss(links);
    await service.softDeleteReviews(review_id);
  }
);
