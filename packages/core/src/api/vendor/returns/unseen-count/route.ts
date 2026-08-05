import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

const ReturnUnseenRowSchema = z.object({
  id: z.string(),
  created_by: z.string().nullable(),
  // A customer-initiated return has no linked custom_fields row until the
  // seller first opens it (see mark-seen), so the readonly link serializes
  // this key as entirely absent (undefined) rather than `null` — `.nullish()`
  // accepts both, where `.nullable()` alone rejected the absent-key case and
  // silently dropped every unseen return from the count.
  custom_fields: z
    .object({ vendor_seen_at: z.coerce.date().nullable() })
    .nullish(),
})

type ReturnUnseenCountResponse = { count: number }

/**
 * Powers the vendor sidebar "İadeler" badge: counts returns the customer
 * requested (never a return the seller created themselves via `/returns`)
 * that this seller has not yet opened — see `[id]/mark-seen`, which is what
 * decrements this per return instead of a bulk "mark all read".
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<ReturnUnseenCountResponse>
): Promise<void> => {
  const sellerId = req.seller_context!.seller_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerOrders } = await query.graph({
    entity: "order_seller",
    filters: { seller_id: sellerId },
    fields: ["order_id"],
  })

  const orderIds = sellerOrders.map((row) => row.order_id)

  if (orderIds.length === 0) {
    res.json({ count: 0 })
    return
  }

  const { data: returns } = await query.graph({
    entity: "return",
    filters: { order_id: orderIds },
    fields: ["id", "created_by", "custom_fields.*"],
  })

  const count = returns.reduce((total, row) => {
    const parsed = ReturnUnseenRowSchema.safeParse(row)
    if (!parsed.success) {
      return total
    }
    const isCustomerInitiated = parsed.data.created_by !== sellerId
    const isUnseen = !parsed.data.custom_fields || !parsed.data.custom_fields.vendor_seen_at
    return isCustomerInitiated && isUnseen ? total + 1 : total
  }, 0)

  res.json({ count })
}
