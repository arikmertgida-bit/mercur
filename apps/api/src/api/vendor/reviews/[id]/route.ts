import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import type { Query } from '@medusajs/framework'
import type {} from '@mercurjs/core/types/seller-context'

import { SellerSummarySchema, parseFirstRow } from '../../../../lib/graph-schemas'
import { emitReviewSellerReplyEvent } from '../../../../lib/review-events'
import { REVIEW_IMAGE_MODULE } from '../../../../modules/review-images'
import ReviewImageService from '../../../../modules/review-images/service'
import { VendorReviewDetailResponse, VendorReviewResponse } from '../../../../modules/reviews/types'
import { REVIEW_SOCIAL_MODULE } from '../../../../modules/review-social'
import ReviewSocialModuleService from '../../../../modules/review-social/service'
import { updateReviewWorkflow } from '../../../../workflows/review/workflows'
import { validateSellerReview } from '../helpers'
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

  res.json({
    review: {
      ...review,
      images: images.map((image) => ({
        id: image.id,
        url: image.url,
        is_hidden: image.is_hidden,
      })),
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

  await updateReviewWorkflow.run({
    container: req.scope,
    input: { id, ...req.validatedBody }
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
  await reviewSocialService.syncSellerReply(id!, sellerId, req.validatedBody.seller_note)

  res.json({
    review
  })
}
