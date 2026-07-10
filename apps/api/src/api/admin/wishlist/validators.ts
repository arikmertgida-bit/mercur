import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export type AdminGetWishlistsParamsType = z.infer<typeof AdminGetWishlistsParams>
export const AdminGetWishlistsParams = createFindParams({
  offset: 0,
  limit: 20,
})
