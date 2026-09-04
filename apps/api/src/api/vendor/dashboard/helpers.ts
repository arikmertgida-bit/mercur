import type { Query } from "@medusajs/framework"

import {
  OrderLiveCountRowSchema,
  SellerScopedOrderLinkRowSchema,
  parseRows,
} from "../../../lib/graph-schemas"
import { getIstanbulDateString } from "../../../lib/reference-price"

export type VendorLiveOrderCounts = {
  today: number
  this_week: number
  this_month: number
}

/**
 * The only part of the vendor dashboard computed fresh on every request —
 * bounded to one seller's orders since the 1st of the current month
 * (Europe/Istanbul), so it stays cheap regardless of platform-wide scale.
 * Everything else on the dashboard (earnings, trend, low stock) is read
 * from the seller-analytics snapshot tables — see
 * apps/api/src/jobs/compute-seller-analytics.ts.
 */
export async function resolveLiveOrderCounts(
  query: Query,
  sellerId: string,
  now: Date
): Promise<VendorLiveOrderCounts> {
  const { data: sellerLinkRows } = await query.graph({
    entity: "order_seller",
    fields: ["order_id", "seller_id"],
    filters: { seller_id: sellerId },
  })
  const orderIds = parseRows(SellerScopedOrderLinkRowSchema, sellerLinkRows as object[]).map(
    (link) => link.order_id
  )

  if (orderIds.length === 0) {
    return { today: 0, this_week: 0, this_month: 0 }
  }

  const todayDate = getIstanbulDateString(now)
  const startOfMonthIso = `${todayDate.slice(0, 7)}-01T00:00:00+03:00`
  const startOfWeek = new Date(now)
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 6)

  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "created_at"],
    filters: { id: orderIds, created_at: { $gte: startOfMonthIso } },
  })
  const orders = parseRows(OrderLiveCountRowSchema, orderRows as object[])

  let today = 0
  let thisWeek = 0
  for (const order of orders) {
    const createdAt = new Date(order.created_at)
    if (getIstanbulDateString(createdAt) === todayDate) {
      today += 1
    }
    if (createdAt >= startOfWeek) {
      thisWeek += 1
    }
  }

  return { today, this_week: thisWeek, this_month: orders.length }
}
