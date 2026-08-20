import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import type { Query } from '@medusajs/framework'
import type {} from '@mercurjs/core/types/seller-context'

import { enrichReplies, ReviewReplyDTO, ReviewReplyRow } from '../../../../../lib/review-reply-helpers'
import { validateSellerReview } from '../../helpers'

/**
 * GET /vendor/reviews/:id/replies
 *
 * Read-only view of the same customer<->seller message thread the
 * storefront's review card renders — powers the vendor Yanıt section's
 * message list. The seller never has a `customer_id`, so `is_liked_by_me`
 * is always false here (a seller cannot like a thread message).
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{ replies: ReviewReplyDTO[] }>
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
  const { data: replies } = await query.graph({
    entity: 'review_reply',
    filters: { review_id: id },
    fields: [
      'id',
      'review_id',
      'content',
      'is_seller_reply',
      'customer_id',
      'seller_id',
      'created_at',
    ],
  })

  const enriched = await enrichReplies(req.scope, replies as ReviewReplyRow[])

  res.json({
    replies: enriched.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
  })
}
