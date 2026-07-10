import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageService from "../../../modules/review-images/service"
import { validateCustomerReview } from "../reviews/helpers"
import { StoreCreateReviewImagesType } from "./validators"

export type StoreCreateReviewImagesResponse = {
  files: Array<{ id: string; review_id: string; url: string; is_hidden: boolean }>
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateReviewImagesType>,
  res: MedusaResponse<StoreCreateReviewImagesResponse>
) => {
  const { review_id, urls } = req.validatedBody
  const customerId = req.auth_context.actor_id

  await validateCustomerReview(req.scope, customerId, review_id)

  const reviewImageService = req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE)

  const files = await reviewImageService.createReviewImages(
    urls.map((url) => ({ review_id, url }))
  )

  res.status(201).json({ files })
}
