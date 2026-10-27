import { SellerStatus } from "@mercurjs/types/seller"
import { z } from "zod"

/** `SellerDTO.status` is typed as a plain string; this narrows it to the known statuses. */
export const SellerStatusSchema = z.enum(SellerStatus)

export const parseSellerStatus = (status: string): SellerStatus | undefined => {
  const parsed = SellerStatusSchema.safeParse(status)

  return parsed.success ? parsed.data : undefined
}
