import { z } from "zod"

export const StoreGetProductPromotionsParams = z.object({
  country_code: z.string().length(2).toLowerCase(),
})

export type StoreGetProductPromotionsParamsType = z.infer<typeof StoreGetProductPromotionsParams>
