import { z } from "zod"

export type StoreGetReviewRepliesParamsType = z.infer<typeof StoreGetReviewRepliesParams>
export const StoreGetReviewRepliesParams = z.object({
  review_id: z.string(),
})

export type StoreCreateReviewReplyType = z.infer<typeof StoreCreateReviewReply>
export const StoreCreateReviewReply = z.object({
  review_id: z.string(),
  content: z.string().min(1).max(500),
})

export type StoreUpdateReviewReplyType = z.infer<typeof StoreUpdateReviewReply>
export const StoreUpdateReviewReply = z.object({
  content: z.string().min(1).max(500),
})
