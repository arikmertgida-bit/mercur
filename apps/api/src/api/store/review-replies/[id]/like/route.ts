import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import { REVIEW_SOCIAL_MODULE } from "../../../../../modules/review-social"
import ReviewSocialModuleService from "../../../../../modules/review-social/service"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{ liked: boolean; likes_count: number }>
) => {
  const { id } = req.params
  const customerId = req.auth_context.actor_id

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: replies } = await query.graph({
    entity: "review_reply",
    filters: { id },
    fields: ["id"],
  })

  if (!replies[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review reply with id: ${id} was not found`
    )
  }

  const reviewSocialService = req.scope.resolve<ReviewSocialModuleService>(
    REVIEW_SOCIAL_MODULE
  )

  const { liked, likesCount } = await reviewSocialService.toggleReplyLike(
    id!,
    customerId
  )

  res.json({ liked, likes_count: likesCount })
}
