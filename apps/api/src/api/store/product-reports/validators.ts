import { z } from "zod"

export type StoreReportProductType = z.infer<typeof StoreReportProduct>
export const StoreReportProduct = z.object({
  reason: z.enum([
    "inaccurate_product_details",
    "pricing_irregularities",
    "prohibited_item",
    "counterfeit_trademark",
    "incorrect_categorization",
    "inappropriate_media",
    "dmca_violation",
    "other",
  ]),
  comment: z.string().min(1).max(1000),
})
