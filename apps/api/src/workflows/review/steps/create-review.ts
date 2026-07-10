import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";

import { REVIEW_MODULE, ReviewModuleService, CreateReviewDTO } from "../../../modules/reviews";
import { Link } from "@medusajs/framework/modules-sdk";

type CreateReviewCompensateInput = {
  review_id: string
  customer_id: string
  order_id: string
}

export const createReviewStep = createStep(
  "create-review",
  async (input: CreateReviewDTO, { container }) => {
    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK);

    const review = await service.createReviews(input);

    await link.create([
      {
        [Modules.CUSTOMER]: {
          customer_id: input.customer_id,
        },
        [REVIEW_MODULE]: {
          review_id: review.id,
        },
      },
      {
        [Modules.ORDER]: {
          order_id: input.order_id,
        },
        [REVIEW_MODULE]: {
          review_id: review.id,
        },
      },
    ]);
    return new StepResponse(review, {
      review_id: review.id,
      customer_id: input.customer_id,
      order_id: input.order_id,
    });
  },
  async (compensateInput: CreateReviewCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return;
    }

    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK);
    const { review_id, customer_id, order_id } = compensateInput;

    await link.dismiss([
      {
        [Modules.CUSTOMER]: { customer_id },
        [REVIEW_MODULE]: { review_id },
      },
      {
        [Modules.ORDER]: { order_id },
        [REVIEW_MODULE]: { review_id },
      },
    ]);
    await service.softDeleteReviews(review_id);
  }
);
