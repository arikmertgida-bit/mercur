import { z } from "zod"

export type StoreDeleteCustomerUploadType = z.infer<typeof StoreDeleteCustomerUpload>

export const StoreDeleteCustomerUpload = z.object({
  fileId: z.string().min(1),
})
