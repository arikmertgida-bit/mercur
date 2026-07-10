import { z } from "zod"

export const SellerMeSchema = z.object({
  seller: z
    .object({
      id: z.string(),
      name: z.string(),
      logo: z.string().nullable().optional(),
    })
    .nullable(),
})

export type SellerMe = z.infer<typeof SellerMeSchema>
