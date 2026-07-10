import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";

import { REVIEW_MODULE, ReviewModuleService, UpdateReviewDTO } from "../../../modules/reviews";

type UpdateReviewCompensateInput = UpdateReviewDTO;

export const updateReviewStep = createStep(
  "update-review",
  async (input: UpdateReviewDTO, { container }) => {
    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);

    const previousReview = await service.retrieveReview(input.id);

    const review = await service.updateReviews(input);

    return new StepResponse(review, {
      id: previousReview.id,
      rating: previousReview.rating,
      customer_note: previousReview.customer_note,
      seller_note: previousReview.seller_note,
    });
  },
  async (compensateInput: UpdateReviewCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return;
    }

    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    await service.updateReviews(compensateInput);
  }
);
