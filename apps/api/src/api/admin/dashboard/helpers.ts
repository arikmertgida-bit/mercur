import type { Query } from "@medusajs/framework"

import { getIstanbulDateString } from "../../../lib/reference-price"

export type AdminLiveOrderCounts = {
  today: number
  this_week: number
  this_month: number
}

/**
 * The only part of the admin dashboard computed fresh on every request:
 * three lightweight platform-wide order COUNTs (no rows fetched, just
 * `metadata.count`), bounded by an indexed created_at range. Everything
 * else (earnings, trend, low-stock, product/seller/customer totals) is
 * read from the seller-analytics snapshot tables — see
 * apps/api/src/jobs/compute-seller-analytics.ts.
 */
export async function resolveLiveAdminOrderCounts(
  query: Query,
  now: Date
): Promise<AdminLiveOrderCounts> {
  const todayDate = getIstanbulDateString(now)
  const startOfTodayIso = `${todayDate}T00:00:00+03:00`
  const startOfMonthIso = `${todayDate.slice(0, 7)}-01T00:00:00+03:00`
  const startOfWeek = new Date(now)
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 6)

  const [{ metadata: todayMeta }, { metadata: weekMeta }, { metadata: monthMeta }] =
    await Promise.all([
      query.graph({
        entity: "order",
        fields: ["id"],
        filters: { created_at: { $gte: startOfTodayIso } },
        pagination: { skip: 0, take: 1 },
      }),
      query.graph({
        entity: "order",
        fields: ["id"],
        filters: { created_at: { $gte: startOfWeek.toISOString() } },
        pagination: { skip: 0, take: 1 },
      }),
      query.graph({
        entity: "order",
        fields: ["id"],
        filters: { created_at: { $gte: startOfMonthIso } },
        pagination: { skip: 0, take: 1 },
      }),
    ])

  return {
    today: todayMeta?.count ?? 0,
    this_week: weekMeta?.count ?? 0,
    this_month: monthMeta?.count ?? 0,
  }
}
