import { z } from "zod"

import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export type StoreGetFollowedSellersParamsType = z.infer<
  typeof StoreGetFollowedSellersParams
>

export const StoreGetFollowedSellersParams = createFindParams({
  offset: 0,
  limit: 20,
})
