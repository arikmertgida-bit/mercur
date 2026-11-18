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

/**
 * The active member's rights from /vendor/members/me?fields=+permissions;
 * absent when the server enforces none.
 */
export const MemberPermissionsSchema = z.object({
  seller_member: z.object({
    permissions: z.record(z.string(), z.enum(["view", "edit", "manage"])).optional(),
  }),
})
