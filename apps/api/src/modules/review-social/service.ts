import { MedusaService } from "@medusajs/framework/utils"

import { ReviewReply } from "./models/review-reply"
import { ReviewLike } from "./models/review-like"
import { ReviewReplyLike } from "./models/review-reply-like"

class ReviewSocialModuleService extends MedusaService({
  ReviewReply,
  ReviewLike,
  ReviewReplyLike,
}) {
  async toggleReviewLike(
    reviewId: string,
    customerId: string
  ): Promise<{ liked: boolean; likesCount: number }> {
    const existing = await this.listReviewLikes({
      review_id: reviewId,
      customer_id: customerId,
    })

    if (existing.length > 0) {
      await this.deleteReviewLikes(existing.map((like) => like.id))
    } else {
      await this.createReviewLikes({
        review_id: reviewId,
        customer_id: customerId,
      })
    }

    const likesCount = await this.getReviewLikesCount(reviewId)
    return { liked: existing.length === 0, likesCount }
  }

  async getReviewLikesCount(reviewId: string): Promise<number> {
    const likes = await this.listReviewLikes({ review_id: reviewId })
    return likes.length
  }

  async getReviewLikesInfo(
    reviewIds: string[],
    customerId?: string
  ): Promise<{ likesCountByReview: Record<string, number>; likedByMe: Set<string> }> {
    if (reviewIds.length === 0) {
      return { likesCountByReview: {}, likedByMe: new Set() }
    }

    const likes = await this.listReviewLikes({ review_id: reviewIds })
    const likesCountByReview: Record<string, number> = {}
    const likedByMe = new Set<string>()

    for (const like of likes) {
      likesCountByReview[like.review_id] = (likesCountByReview[like.review_id] ?? 0) + 1
      if (customerId && like.customer_id === customerId) {
        likedByMe.add(like.review_id)
      }
    }

    return { likesCountByReview, likedByMe }
  }

  async toggleReplyLike(
    replyId: string,
    customerId: string
  ): Promise<{ liked: boolean; likesCount: number }> {
    const existing = await this.listReviewReplyLikes({
      reply_id: replyId,
      customer_id: customerId,
    })

    if (existing.length > 0) {
      await this.deleteReviewReplyLikes(existing.map((like) => like.id))
    } else {
      await this.createReviewReplyLikes({
        reply_id: replyId,
        customer_id: customerId,
      })
    }

    const likesCount = await this.getReplyLikesCount(replyId)
    return { liked: existing.length === 0, likesCount }
  }

  async getReplyLikesCount(replyId: string): Promise<number> {
    const likes = await this.listReviewReplyLikes({ reply_id: replyId })
    return likes.length
  }

  async getReplyLikesInfo(
    replyIds: string[],
    customerId?: string
  ): Promise<{ likesCountByReply: Record<string, number>; likedByMe: Set<string> }> {
    if (replyIds.length === 0) {
      return { likesCountByReply: {}, likedByMe: new Set() }
    }

    const likes = await this.listReviewReplyLikes({ reply_id: replyIds })
    const likesCountByReply: Record<string, number> = {}
    const likedByMe = new Set<string>()

    for (const like of likes) {
      likesCountByReply[like.reply_id] = (likesCountByReply[like.reply_id] ?? 0) + 1
      if (customerId && like.customer_id === customerId) {
        likedByMe.add(like.reply_id)
      }
    }

    return { likesCountByReply, likedByMe }
  }

  /**
   * Appends one new seller message to the review's reply thread — every
   * call creates a fresh `review_reply` row, mirroring how the customer
   * side (`/store/review-replies` POST) already behaves. Never updates an
   * existing row: a seller answering the same review twice must produce
   * two separate thread messages, not one message overwritten in place.
   */
  async createSellerReply(
    reviewId: string,
    sellerId: string,
    content: string
  ): Promise<string> {
    const created = await this.createReviewReplies({
      review_id: reviewId,
      content,
      is_seller_reply: true,
      seller_id: sellerId,
      customer_id: null,
    })
    return created.id
  }
}

export default ReviewSocialModuleService
