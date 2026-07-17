import { AuthenticatedMedusaRequest } from "@medusajs/framework"
import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import { REVIEW_SOCIAL_MODULE } from "../../../modules/review-social"
import ReviewSocialModuleService from "../../../modules/review-social/service"
import { enrichReplies, ReviewReplyDTO, ReviewReplyRow } from "./helpers"
import { StoreCreateReviewReplyType, StoreGetReviewRepliesParamsType } from "./validators"

export const GET = async (
  req: MedusaStoreRequest<never, StoreGetReviewRepliesParamsType>,
  res: MedusaResponse<{ replies: ReviewReplyDTO[] }>
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { review_id } = req.validatedQuery

  const { data: replies } = await query.graph({
    entity: "review_reply",
    filters: { review_id },
    fields: [
      "id",
      "review_id",
      "content",
      "is_seller_reply",
      "customer_id",
      "seller_id",
      "created_at",
    ],
  })

  const currentCustomerId = req.auth_context?.actor_id

  const enriched = await enrichReplies(
    req.scope,
    replies as ReviewReplyRow[],
    currentCustomerId
  )

  res.json({ replies: enriched.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)) })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateReviewReplyType>,
  res: MedusaResponse<{ reply: ReviewReplyDTO }>
) => {
  const customerId = req.auth_context.actor_id
  const { review_id, content } = req.validatedBody

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: reviews } = await query.graph({
    entity: "review",
    filters: { id: review_id },
    fields: ["id"],
  })

  if (!reviews[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review with id: ${review_id} was not found`
    )
  }

  const reviewSocialService = req.scope.resolve<ReviewSocialModuleService>(
    REVIEW_SOCIAL_MODULE
  )

  const reply = await reviewSocialService.createReviewReplies({
    review_id,
    content,
    is_seller_reply: false,
    customer_id: customerId,
    seller_id: null,
  })

  const [enriched] = await enrichReplies(req.scope, [reply as ReviewReplyRow], customerId)

  res.status(201).json({ reply: enriched! })
}
