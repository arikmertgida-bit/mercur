import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import type { Query } from '@medusajs/framework'
import type {} from '@mercurjs/core/types/seller-context'

import { SellerSummarySchema, parseFirstRow } from '../../../../lib/graph-schemas'
import { emitReviewSellerReplyEvent } from '../../../../lib/review-events'
import { computeAwaitingReplyMap, fetchReviewReplyActivity } from '../../../../lib/review-reply-helpers'
import { REVIEW_IMAGE_MODULE } from '../../../../modules/review-images'
import ReviewImageService from '../../../../modules/review-images/service'
import { REVIEW_REPLY_IMAGE_MODULE } from '../../../../modules/review-reply-images'
import ReviewReplyImageService from '../../../../modules/review-reply-images/service'
import { VendorReviewDetailResponse, VendorReviewResponse } from '../../../../modules/reviews/types'
import { REVIEW_SOCIAL_MODULE } from '../../../../modules/review-social'
import ReviewSocialModuleService from '../../../../modules/review-social/service'
import { updateReviewWorkflow } from '../../../../workflows/review/workflows'
import { mapReviewCustomer, validateSellerReview } from '../helpers'
import { VendorUpdateReviewType } from '../validators'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorReviewDetailResponse>
) => {
  const { id } = req.params
  const sellerId = req.seller_context?.seller_id

  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Authenticated seller not found'
    )
  }

  await validateSellerReview(req.scope, sellerId, id!)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [review]
  } = await query.graph({
    entity: 'review',
    fields: req.queryConfig.fields,
    filters: {
      id
    }
  })

  const reviewImageService = req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE)
  const images = await reviewImageService.listReviewImages({ review_id: id })

  const replies = await fetchReviewReplyActivity(req.scope, [review.id])
  const awaitingReplyByReview = computeAwaitingReplyMap([review], replies)

  res.json({
    review: {
      ...review,
      customer: mapReviewCustomer(review.customer),
      images: images.map((image) => ({
        id: image.id,
        url: image.url,
        is_hidden: image.is_hidden,
      })),
      is_awaiting_reply: awaitingReplyByReview.get(review.id) ?? false,
    },
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateReviewType>,
  res: MedusaResponse<VendorReviewResponse>
) => {
  const { id } = req.params
  const sellerId = req.seller_context?.seller_id

  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Authenticated seller not found'
    )
  }

  await validateSellerReview(req.scope, sellerId, id!)

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { seller_note, image_urls } = req.validatedBody

  await updateReviewWorkflow.run({
    container: req.scope,
    input: { id, seller_note }
  })

  const {
    data: [review]
  } = await query.graph({
    entity: 'review',
    fields: req.queryConfig.fields,
    filters: {
      id
    }
  })

  const { data: sellers } = await query.graph({
    entity: 'seller',
    filters: { id: sellerId },
    fields: ['id', 'name']
  })
  const seller = parseFirstRow(SellerSummarySchema, sellers)

  await emitReviewSellerReplyEvent(req.scope, {
    reviewId: id!,
    sellerId,
    sellerName: seller?.name ?? null
  })

  const reviewSocialService = req.scope.resolve<ReviewSocialModuleService>(
    REVIEW_SOCIAL_MODULE
  )
  const replyId = await reviewSocialService.createSellerReply(id!, sellerId, seller_note)

  if (image_urls && image_urls.length > 0) {
    const reviewReplyImageService = req.scope.resolve<ReviewReplyImageService>(
      REVIEW_REPLY_IMAGE_MODULE
    )
    await reviewReplyImageService.createReviewReplyImages(
      image_urls.map((url) => ({ review_reply_id: replyId, url }))
    )
  }

  res.json({
    review
  })
}
