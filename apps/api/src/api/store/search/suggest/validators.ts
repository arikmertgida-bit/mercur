import { z } from 'zod'

export const StoreGetSearchSuggestParams = z.object({
  country_code: z.string().min(2).max(2),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(24).default(8),
})

export type StoreGetSearchSuggestParamsType = z.infer<typeof StoreGetSearchSuggestParams>
