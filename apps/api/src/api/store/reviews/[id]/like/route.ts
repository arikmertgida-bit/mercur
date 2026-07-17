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
  const { data: reviews } = await query.graph({
    entity: "review",
    filters: { id },
    fields: ["id"],
  })

  if (!reviews[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review with id: ${id} was not found`
    )
  }

  const reviewSocialService = req.scope.resolve<ReviewSocialModuleService>(
    REVIEW_SOCIAL_MODULE
  )

  const { liked, likesCount } = await reviewSocialService.toggleReviewLike(
    id!,
    customerId
  )

  res.json({ liked, likes_count: likesCount })
}
