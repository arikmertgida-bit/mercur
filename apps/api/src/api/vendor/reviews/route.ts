import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { computeAwaitingReplyMap, fetchReviewReplyActivity } from '../../../lib/review-reply-helpers'
import { REVIEW_IMAGE_MODULE } from '../../../modules/review-images'
import ReviewImageService from '../../../modules/review-images/service'
import { ReviewImageDTO, VendorReviewListWithImagesResponse } from '../../../modules/reviews/types'
import { mapReviewCustomer } from './helpers'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorReviewListWithImagesResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // req.filterableFields.$and already scopes results to this seller's
  // visible review ids (direct seller reviews + reviews on their own
  // products) — see applySellerReviewIdFilter in ./middlewares.ts.
  const { data: reviewRows, metadata } = await query.graph({
    entity: 'review',
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination
  })

  const reviewIds = reviewRows.map((review) => review.id)

  const imagesByReview: Record<string, ReviewImageDTO[]> = {}
  if (reviewIds.length > 0) {
    const reviewImageService =
      req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE)
    const images = await reviewImageService.listReviewImages({
      review_id: reviewIds,
    })
    for (const image of images) {
      const list = imagesByReview[image.review_id] ?? []
      list.push({ id: image.id, url: image.url, is_hidden: image.is_hidden })
      imagesByReview[image.review_id] = list
    }
  }

  const replies = await fetchReviewReplyActivity(req.scope, reviewIds)
  const awaitingReplyByReview = computeAwaitingReplyMap(reviewRows, replies)

  res.json({
    reviews: reviewRows.map((review) => ({
      ...review,
      customer: mapReviewCustomer(review.customer),
      images: imagesByReview[review.id] ?? [],
      is_awaiting_reply: awaitingReplyByReview.get(review.id) ?? false,
    })),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0
  })
}
