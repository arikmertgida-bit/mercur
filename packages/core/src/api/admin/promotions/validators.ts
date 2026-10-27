import { AdminGetPromotionsRuleValueParams } from "@medusajs/medusa/api/admin/promotions/validators"
import { z } from "zod"

// The store picker of a buyget promotion narrows product values to its seller.
export const AdminGetPromotionsRuleValueWithSeller =
  AdminGetPromotionsRuleValueParams.merge(
    z.object({ seller_id: z.string().optional() })
  )

export type AdminGetPromotionsRuleValueWithSellerType = z.infer<
  typeof AdminGetPromotionsRuleValueWithSeller
>
