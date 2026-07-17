import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

import { REVIEW_SOCIAL_MODULE } from "../../../../modules/review-social"
import ReviewSocialModuleService from "../../../../modules/review-social/service"
import { enrichReplies, ReviewReplyDTO, ReviewReplyRow, validateOwnCustomerReply } from "../helpers"
import { StoreUpdateReviewReplyType } from "../validators"

export const PUT = async (
  req: AuthenticatedMedusaRequest<StoreUpdateReviewReplyType>,
  res: MedusaResponse<{ reply: ReviewReplyDTO }>
) => {
  const { id } = req.params
  const customerId = req.auth_context.actor_id

  await validateOwnCustomerReply(req.scope, customerId, id!)

  const reviewSocialService = req.scope.resolve<ReviewSocialModuleService>(
    REVIEW_SOCIAL_MODULE
  )

  const reply = await reviewSocialService.updateReviewReplies({
    id: id!,
    content: req.validatedBody.content,
  })

  const [enriched] = await enrichReplies(req.scope, [reply as ReviewReplyRow], customerId)

  res.json({ reply: enriched! })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{ id: string; object: "review_reply"; deleted: boolean }>
) => {
  const { id } = req.params
  const customerId = req.auth_context.actor_id

  await validateOwnCustomerReply(req.scope, customerId, id!)

  const reviewSocialService = req.scope.resolve<ReviewSocialModuleService>(
    REVIEW_SOCIAL_MODULE
  )

  await reviewSocialService.deleteReviewReplies([id!])

  res.json({ id: id!, object: "review_reply", deleted: true })
}
