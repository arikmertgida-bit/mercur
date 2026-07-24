import { z } from "zod"
import { REVIEW_MAX_IMAGES } from "../../../modules/review-images"

export type StoreCreateReviewImagesType = z.infer<typeof StoreCreateReviewImages>
export const StoreCreateReviewImages = z.object({
  review_id: z.string(),
  urls: z.array(z.string().trim().min(1)).max(REVIEW_MAX_IMAGES),
})

// Normalized (comma-split, deduped-not-required) in the route via
// toStringArray — same string | string[] shape as StoreGetSellerProductsParams.
export type StoreGetReviewImagesType = z.infer<typeof StoreGetReviewImages>
export const StoreGetReviewImages = z.object({
  review_id: z.union([z.string(), z.array(z.string())]),
})

export type StoreReportReviewImageType = z.infer<typeof StoreReportReviewImage>
export const StoreReportReviewImage = z.object({
  reason: z.string().min(1).max(500),
})
