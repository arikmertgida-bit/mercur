import { SellerStatus } from "@mercurjs/types"
import { z } from "zod"

export const SellerContextMemberSchema = z.object({
  id: z.string(),
  seller_id: z.string(),
  member_id: z.string(),
  role_id: z.string().nullable(),
  seller: z.object({
    id: z.string(),
    currency_code: z.string(),
    status: z.enum(SellerStatus),
  }),
})

export type SellerContextMember = z.infer<typeof SellerContextMemberSchema>

export interface SellerContext {
  seller_id: string
  currency_code: string
  seller_member: SellerContextMember
}

declare module "express" {
  interface Request {
    seller_context?: SellerContext
  }
}
