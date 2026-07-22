import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type StoreGetReviewsParamsType = z.infer<typeof StoreGetReviewsParams>
export const StoreGetReviewsParams = createFindParams({
  offset: 0,
  limit: 50
})

export type StoreCreateReviewType = z.infer<typeof StoreCreateReview>
export const StoreCreateReview = z.object({
  // Nullable/optional: the env-configured review-bypass customer (see
  // `lib/review-bypass.ts`) submits reviews with no order at all. Every
  // other request is still required to resolve to an owned order in
  // `validateReviewStep`.
  order_id: z.string().min(1).nullable().optional(),
  reference: z.enum(['seller', 'product']),
  reference_id: z.string(),
  rating: z.number().int().min(1).max(5),
  customer_note: z.string().max(300).nullable()
})

export type StoreUpdateReviewType = z.infer<typeof StoreUpdateReview>
export const StoreUpdateReview = z.object({
  rating: z.number().int().min(1).max(5),
  customer_note: z.string().max(300).nullable()
})
