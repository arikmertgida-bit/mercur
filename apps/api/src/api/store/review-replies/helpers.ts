import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

export { enrichReplies } from "../../../lib/review-reply-helpers"
export type { ReviewReplyDTO, ReviewReplyRow } from "../../../lib/review-reply-helpers"

export const validateOwnCustomerReply = async (
  scope: MedusaContainer,
  customerId: string,
  replyId: string
): Promise<void> => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: replies } = await query.graph({
    entity: "review_reply",
    filters: { id: replyId },
    fields: ["id", "customer_id", "is_seller_reply"],
  })

  const reply = replies[0]

  if (!reply || reply.is_seller_reply || reply.customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review reply with id: ${replyId} was not found`
    )
  }
}
