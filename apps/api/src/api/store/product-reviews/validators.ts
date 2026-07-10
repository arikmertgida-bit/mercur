import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

const StoreGetProductReviewsParamsFields = z.object({
  product_id: z.string(),
})

export type StoreGetProductReviewsParamsType = z.infer<
  typeof StoreGetProductReviewsParams
>
export const StoreGetProductReviewsParams = createFindParams({
  offset: 0,
  limit: 50,
}).merge(StoreGetProductReviewsParamsFields)
