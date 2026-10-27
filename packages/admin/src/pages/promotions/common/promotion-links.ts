import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

// Medusa's promotion type has no Mercur links; the detail query selects
// `seller` (the owning store) and `promotion_cost`, so they are read from it.
const PromotionLinksSchema = z.object({
  seller: z.object({ id: z.string(), name: z.string().nullish() }).nullish(),
  promotion_cost: z
    .object({
      cost_bearer: z.enum(["store", "marketplace", "shared"]),
      shared_marketplace_percentage: z.number().nullish(),
    })
    .nullish()
    // A malformed cost must not hide the owner.
    .catch(undefined),
})

export type PromotionLinks = z.infer<typeof PromotionLinksSchema>

export const getPromotionLinks = (
  promotion: HttpTypes.AdminPromotion
): PromotionLinks => {
  const parsed = PromotionLinksSchema.safeParse(promotion)

  return parsed.success ? parsed.data : {}
}
