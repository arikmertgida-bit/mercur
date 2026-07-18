import { z } from "zod"

export const StoreGetCampaignsParams = z.object({
  status: z.enum(["active", "upcoming"]),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
})

export type StoreGetCampaignsParamsType = z.infer<typeof StoreGetCampaignsParams>
