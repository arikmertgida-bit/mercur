import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import { z } from "zod"

import { REVIEW_REPLY_IMAGE_MODULE } from "../modules/review-reply-images"
import ReviewReplyImageService from "../modules/review-reply-images/service"
import { REVIEW_SOCIAL_MODULE } from "../modules/review-social"
import ReviewSocialModuleService from "../modules/review-social/service"
import { extractAvatarUrl, JsonRecordSchema, parseRows } from "./graph-schemas"

type ReviewActivityRow = {
  id: string
  created_at: string | Date
}

type ReviewReplyActivityRow = {
  review_id: string
  is_seller_reply: boolean
  updated_at: string | Date
}

const toTime = (value: string | Date): number => new Date(value).getTime()

/**
 * A review is "awaiting reply" when the customer side of the thread (the
 * original review, or any later customer `review_reply` message) is more
 * recent than the seller's own last reply — thread-aware on purpose, so a
 * customer following up on an already-answered review flips this back on
 * instead of only looking at the review's very first `seller_note`. Shared
 * by `/vendor/reviews/stats` (nav badge count), `/vendor/reviews` (list
 * column) and `/vendor/reviews/:id` (detail header) so the badge and the
 * rows it counts can never drift apart.
 */
export const computeAwaitingReplyMap = (
  reviews: ReviewActivityRow[],
  replies: ReviewReplyActivityRow[]
): Map<string, boolean> => {
  const lastCustomerActivityByReview = new Map<string, number>()
  const lastSellerActivityByReview = new Map<string, number>()

  for (const review of reviews) {
    lastCustomerActivityByReview.set(review.id, toTime(review.created_at))
  }

  for (const reply of replies) {
    const target = reply.is_seller_reply
      ? lastSellerActivityByReview
      : lastCustomerActivityByReview
    const time = toTime(reply.updated_at)
    const current = target.get(reply.review_id) ?? -Infinity
    if (time > current) {
      target.set(reply.review_id, time)
    }
  }

  const result = new Map<string, boolean>()
  for (const review of reviews) {
    const lastCustomerActivity = lastCustomerActivityByReview.get(review.id) ?? -Infinity
    const lastSellerActivity = lastSellerActivityByReview.get(review.id) ?? -Infinity
    result.set(review.id, lastCustomerActivity > lastSellerActivity)
  }
  return result
}

/**
 * Fetches the `review_reply` rows needed to place the given reviews on the
 * `computeAwaitingReplyMap` timeline. Callers that already loaded the
 * reviews themselves (for `id`/`created_at`) pass those rows straight into
 * `computeAwaitingReplyMap` — this helper only covers the reply half.
 */
export const fetchReviewReplyActivity = async (
  scope: MedusaContainer,
  reviewIds: string[]
): Promise<ReviewReplyActivityRow[]> => {
  if (reviewIds.length === 0) {
    return []
  }

  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: replies } = await query.graph({
    entity: "review_reply",
    fields: ["review_id", "is_seller_reply", "updated_at"],
    filters: { review_id: reviewIds },
  })

  return replies as ReviewReplyActivityRow[]
}

const ReplyCustomerRowSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  metadata: JsonRecordSchema.nullable().optional(),
})

export type ReviewReplyRow = {
  id: string
  review_id: string
  content: string
  is_seller_reply: boolean
  customer_id: string | null
  seller_id: string | null
  created_at: string | Date
}

export type ReviewReplyImageDTO = {
  id: string
  url: string
}

export type ReviewReplyDTO = {
  id: string
  review_id: string
  customer_id: string | null
  customer: { first_name: string; last_name: string; avatar_url?: string } | null
  is_seller_reply: boolean
  seller_id: string | null
  seller_name: string | null
  content: string
  images: ReviewReplyImageDTO[]
  created_at: string | Date
  likes_count: number
  is_liked_by_me: boolean
}

/**
 * Shared by `/store/review-replies` (customer thread) and
 * `/vendor/reviews/:id/replies` (seller's read-only view of the same
 * thread) — kept in `lib/` instead of duplicated per-surface since the
 * enrichment logic (customer/seller name+avatar resolution, like counts) is
 * identical regardless of who's reading it.
 */
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

  const customerById = new Map<string, z.infer<typeof ReplyCustomerRowSchema>>()
  if (customerIds.length > 0) {
    const { data: customers } = await query.graph({
      entity: "customer",
      filters: { id: customerIds },
      fields: ["id", "first_name", "last_name", "metadata"],
    })
    for (const customer of parseRows(ReplyCustomerRowSchema, customers)) {
      customerById.set(customer.id, customer)
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

  const replyIds = replies.map((reply) => reply.id)
  const imagesByReply = new Map<string, ReviewReplyImageDTO[]>()
  if (replyIds.length > 0) {
    const reviewReplyImageService = scope.resolve<ReviewReplyImageService>(REVIEW_REPLY_IMAGE_MODULE)
    const images = await reviewReplyImageService.listReviewReplyImages({
      review_reply_id: replyIds,
    })
    for (const image of images) {
      const list = imagesByReply.get(image.review_reply_id) ?? []
      list.push({ id: image.id, url: image.url })
      imagesByReply.set(image.review_reply_id, list)
    }
  }

  return replies.map((reply) => {
    const customer = reply.customer_id ? customerById.get(reply.customer_id) : undefined
    return {
      id: reply.id,
      review_id: reply.review_id,
      customer_id: reply.customer_id,
      customer: customer
        ? {
            first_name: customer.first_name ?? "",
            last_name: customer.last_name ?? "",
            avatar_url: extractAvatarUrl(customer.metadata),
          }
        : null,
      is_seller_reply: reply.is_seller_reply,
      seller_id: reply.seller_id,
      seller_name: reply.seller_id ? sellerNameById.get(reply.seller_id) ?? null : null,
      content: reply.content,
      images: imagesByReply.get(reply.id) ?? [],
      created_at: reply.created_at,
      likes_count: likesCountByReply[reply.id] ?? 0,
      is_liked_by_me: likedByMe.has(reply.id),
    }
  })
}
