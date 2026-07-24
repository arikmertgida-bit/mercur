import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { toStringArray } from "../../../lib/query-params"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageService from "../../../modules/review-images/service"
import { validateCustomerReview } from "../reviews/helpers"
import { StoreCreateReviewImagesType, StoreGetReviewImagesType } from "./validators"

export type StoreCreateReviewImagesResponse = {
  files: Array<{ id: string; review_id: string; url: string; is_hidden: boolean }>
}

export type StoreReviewImagesByReviewResponse = {
  images: Record<string, Array<{ id: string; url: string; is_hidden: boolean }>>
}

/**
 * Public bulk lookup: review images have no query.graph relation back to
 * `review` (see the comment in store/reviews/route.ts), so any page that
 * gets its reviews from a different source than /store/product-reviews or
 * /store/reviews (e.g. the seller-page reviews tab, embedded via
 * /store/sellers) needs this to fill in `images` itself.
 */
export const GET = async (
  req: MedusaRequest<never, StoreGetReviewImagesType>,
  res: MedusaResponse<StoreReviewImagesByReviewResponse>
) => {
  const reviewIds = toStringArray(req.validatedQuery.review_id)

  const images: Record<string, Array<{ id: string; url: string; is_hidden: boolean }>> = {}
  if (reviewIds.length > 0) {
    const reviewImageService = req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE)
    const rows = await reviewImageService.listReviewImages({
      review_id: reviewIds,
      is_hidden: false,
    })
    for (const row of rows) {
      const list = images[row.review_id] ?? []
      list.push({ id: row.id, url: row.url, is_hidden: row.is_hidden })
      images[row.review_id] = list
    }
  }

  res.json({ images })
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
