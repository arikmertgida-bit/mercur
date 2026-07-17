import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import { REVIEW_SOCIAL_MODULE } from "../../../modules/review-social"
import ReviewSocialModuleService from "../../../modules/review-social/service"

export type ReviewReplyRow = {
  id: string
  review_id: string
  content: string
  is_seller_reply: boolean
  customer_id: string | null
  seller_id: string | null
  created_at: string | Date
}

export type ReviewReplyDTO = {
  id: string
  review_id: string
  customer_id: string | null
  customer: { first_name: string; last_name: string } | null
  is_seller_reply: boolean
  seller_id: string | null
  seller_name: string | null
  content: string
  created_at: string | Date
  likes_count: number
  is_liked_by_me: boolean
}

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

export const enrichReplies = async (
  scope: MedusaContainer,
  replies: ReviewReplyRow[],
  currentCustomerId?: string
): Promise<ReviewReplyDTO[]> => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const customerIds = Array.from(
    new Set(replies.map((reply) => reply.customer_id).filter((id): id is string => !!id))
  )
  const sellerIds = Array.from(
    new Set(replies.map((reply) => reply.seller_id).filter((id): id is string => !!id))
  )

  const customerById = new Map<string, { first_name: string | null; last_name: string | null }>()
  if (customerIds.length > 0) {
    const { data: customers } = await query.graph({
      entity: "customer",
      filters: { id: customerIds },
      fields: ["id", "first_name", "last_name"],
    })
    for (const customer of customers) {
      customerById.set(customer.id, {
        first_name: customer.first_name ?? null,
        last_name: customer.last_name ?? null,
      })
    }
  }

  const sellerNameById = new Map<string, string>()
  if (sellerIds.length > 0) {
    const { data: sellers } = await query.graph({
      entity: "seller",
      filters: { id: sellerIds },
      fields: ["id", "name"],
    })
    for (const seller of sellers) {
      sellerNameById.set(seller.id, seller.name)
    }
  }

  const reviewSocialService = scope.resolve<ReviewSocialModuleService>(REVIEW_SOCIAL_MODULE)
  const { likesCountByReply, likedByMe } = await reviewSocialService.getReplyLikesInfo(
    replies.map((reply) => reply.id),
    currentCustomerId
  )

  return replies.map((reply) => {
    const customer = reply.customer_id ? customerById.get(reply.customer_id) : undefined
    return {
      id: reply.id,
      review_id: reply.review_id,
      customer_id: reply.customer_id,
      customer: customer
        ? { first_name: customer.first_name ?? "", last_name: customer.last_name ?? "" }
        : null,
      is_seller_reply: reply.is_seller_reply,
      seller_id: reply.seller_id,
      seller_name: reply.seller_id ? sellerNameById.get(reply.seller_id) ?? null : null,
      content: reply.content,
      created_at: reply.created_at,
      likes_count: likesCountByReply[reply.id] ?? 0,
      is_liked_by_me: likedByMe.has(reply.id),
    }
  })
}
