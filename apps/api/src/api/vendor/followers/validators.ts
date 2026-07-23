import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export type VendorGetFollowersParamsType = z.infer<typeof VendorGetFollowersParams>
export const VendorGetFollowersParams = createFindParams({
  offset: 0,
  limit: 20,
})
