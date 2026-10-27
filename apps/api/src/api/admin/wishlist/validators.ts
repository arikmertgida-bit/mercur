import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

// Client-facing contract for this list endpoint (the route itself reads
// `req.queryConfig` / `req.filterableFields`). Every query param is optional
// on the wire — `createFindParams` defaults offset/limit server-side — while
// zod 4 marks defaulted keys as required in the parsed output type.
export type AdminGetWishlistsParamsType = Partial<z.infer<typeof AdminGetWishlistsParams>>
export const AdminGetWishlistsParams = createFindParams({
  offset: 0,
  limit: 20,
})
