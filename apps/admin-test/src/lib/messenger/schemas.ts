import { z } from "zod"

// ── Admin API response schemas used by the messenger integration ───────────

export const AdminUserMeSchema = z.object({
  user: z.object({
    id: z.string(),
  }),
})

export const AdminProductSchema = z.object({
  product: z.object({
    id: z.string(),
    title: z.string(),
    thumbnail: z.string().nullable(),
    handle: z.string().nullable(),
  }),
})

export const AdminCustomerSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string(),
})

export const AdminCustomerResponseSchema = z.object({
  customer: AdminCustomerSchema,
})

export type AdminUserMe = z.infer<typeof AdminUserMeSchema>
export type AdminProduct = z.infer<typeof AdminProductSchema>
export type AdminCustomerResponse = z.infer<typeof AdminCustomerResponseSchema>
