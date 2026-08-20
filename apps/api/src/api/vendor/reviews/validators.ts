import { z } from "zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";

import { REVIEW_REPLY_MAX_IMAGES } from "../../../modules/review-reply-images";

export type VendorGetReviewsParamsType = z.infer<typeof VendorGetReviewsParams>;
export const VendorGetReviewsParams = createFindParams({
  offset: 0,
  limit: 50,
});

export type VendorUpdateReviewType = z.infer<typeof VendorUpdateReview>;
export const VendorUpdateReview = z.object({
  seller_note: z.string().min(1).max(300),
  image_urls: z.array(z.string().url()).max(REVIEW_REPLY_MAX_IMAGES).optional(),
});
