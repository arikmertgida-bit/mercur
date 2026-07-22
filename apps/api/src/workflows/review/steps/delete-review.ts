import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { Link } from "@medusajs/framework/modules-sdk";

import { REVIEW_MODULE, ReviewModuleService } from "../../../modules/reviews";

export const deleteReviewStep = createStep(
  "delete-review",
  async (id: string, { container }) => {
    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK);

    await service.softDeleteReviews(id);
    // Soft-deleting the review row does not remove the pivot rows in the
    // customer_review / order_review / product_review / seller_review link
    // tables — left behind, they resolve to a null `review` on any future
    // link traversal (store/product-reviews count vs. reviews array
    // mismatch; store/reviews crashing customer's "written reviews" list
    // entirely since it never null-filters). Cascade-remove every link
    // pointing at this review id, regardless of which module is on the
    // other side.
    await link.delete({ [REVIEW_MODULE]: { review_id: id } });

    return new StepResponse(id, id);
  },
  async (id: string | undefined, { container }) => {
    if (!id) {
      return;
    }

    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE);
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK);

    await link.restore({ [REVIEW_MODULE]: { review_id: id } });
    await service.restoreReviews(id);
  }
);
