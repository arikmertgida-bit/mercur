import { z } from 'zod'

const csvOrArray = z.union([z.string(), z.array(z.string())])

export const StoreGetCatalogProductsParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
  country_code: z.string().min(2).max(2),
  collection_id: csvOrArray.optional(),
  q: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'created_at', 'created_at_asc']).optional(),
  category_id: csvOrArray.optional(),
  type_id: csvOrArray.optional(),
  tag_id: csvOrArray.optional(),
  size: csvOrArray.optional(),
  color: csvOrArray.optional(),
  condition: csvOrArray.optional(),
  promotion_type: csvOrArray.optional(),
  campaign_id: z.string().optional(),
  has_active_campaign: z.coerce.boolean().optional(),
})

export type StoreGetCatalogProductsParamsType = z.infer<typeof StoreGetCatalogProductsParams>
