import type { Query } from "@medusajs/framework"
import { CommissionLineDTO } from "@mercurjs/types"

import {
  OrderAnalyticsRow,
  OrderAnalyticsRowSchema,
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

export type VendorLiveTodayEarnings = {
  orders_count: number
  gross_revenue: number
  net_earnings: number
}

const ID_BATCH_LIMIT = 200

// @mercurjs/core only publishes the commission module's index barrel, not
// its concrete service class — mirrors the same narrow read contract
// apps/api/src/jobs/compute-seller-analytics.ts defines for itself, typed
// against the one method this route actually calls.
export interface CommissionLineReader {
  listCommissionLines(filters: { item_id: string[] }): Promise<CommissionLineDTO[]>
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// Rounds like currency math should: 2 decimal places, no floating-point
// crumbs in a number a vendor will actually read on screen. Mirrors
// apps/api/src/jobs/compute-seller-analytics.ts's roundCurrency exactly, so
// a live "today" figure and tomorrow's materialized row for the same day
// never disagree by a rounding artifact.
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Every order id linked to this seller, unfiltered by date — the shared base
 * both resolveLiveOrderCounts and resolveLiveTodayEarnings bucket/aggregate
 * from, so a single dashboard load never pays for this join twice.
 */
export async function loadSellerOrderIds(query: Query, sellerId: string): Promise<string[]> {
  const { data: sellerLinkRows } = await query.graph({
    entity: "order_seller",
    fields: ["order_id", "seller_id"],
    filters: { seller_id: sellerId },
  })
  return parseRows(SellerScopedOrderLinkRowSchema, sellerLinkRows as object[]).map(
    (link) => link.order_id
  )
}

/**
 * The only part of the vendor dashboard computed fresh on every request —
 * bounded to one seller's orders since the 1st of the current month
 * (Europe/Istanbul), so it stays cheap regardless of platform-wide scale.
 * The trend chart and low-stock widget are read from the seller-analytics
 * snapshot tables — see apps/api/src/jobs/compute-seller-analytics.ts.
 */
export async function resolveLiveOrderCounts(
  query: Query,
  orderIds: string[],
  now: Date
): Promise<VendorLiveOrderCounts> {
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

/**
 * "Bugünkü Kazanç" — computed live and bounded to one seller's orders since
 * Istanbul midnight, using the same commission-aware math
 * compute-seller-analytics.ts materializes every 12h for the trend chart.
 *
 * The materialized seller_daily_stats row for "today" only starts existing
 * once that job has run for the current calendar day (00:00 / 12:00 UTC ==
 * 03:00 / 15:00 Istanbul) — reading the latest materialized row directly
 * (the previous approach) kept showing yesterday's fully-computed total,
 * mislabeled as today's, for the three hours between Istanbul midnight and
 * that first run, and would keep showing a stale day indefinitely if a run
 * were ever missed. A seller's handful of orders since midnight is cheap
 * to aggregate live — the same complexity class as resolveLiveOrderCounts
 * above — so there is no reason to trade correctness for it the way the
 * multi-day historical trend does.
 */
export async function resolveLiveTodayEarnings(
  query: Query,
  orderIds: string[],
  now: Date,
  commissionService: CommissionLineReader
): Promise<VendorLiveTodayEarnings> {
  if (orderIds.length === 0) {
    return { orders_count: 0, gross_revenue: 0, net_earnings: 0 }
  }

  const startOfTodayIso = `${getIstanbulDateString(now)}T00:00:00+03:00`

  const todaysOrders: OrderAnalyticsRow[] = []
  for (const orderIdChunk of chunk(orderIds, ID_BATCH_LIMIT)) {
    const { data: rows } = await query.graph({
      entity: "order",
      fields: ["id", "currency_code", "summary.accounting_total", "created_at", "items.id"],
      filters: { id: orderIdChunk, created_at: { $gte: startOfTodayIso } },
    })
    todaysOrders.push(...parseRows(OrderAnalyticsRowSchema, rows as object[]))
  }

  if (todaysOrders.length === 0) {
    return { orders_count: 0, gross_revenue: 0, net_earnings: 0 }
  }

  const itemIdToOrderId = new Map<string, string>()
  for (const order of todaysOrders) {
    for (const item of order.items ?? []) {
      itemIdToOrderId.set(item.id, order.id)
    }
  }

  const commissionByOrderId = new Map<string, number>()
  const itemIds = Array.from(itemIdToOrderId.keys())
  for (const itemIdChunk of chunk(itemIds, ID_BATCH_LIMIT)) {
    if (itemIdChunk.length === 0) {
      continue
    }
    const lines = await commissionService.listCommissionLines({ item_id: itemIdChunk })
    for (const line of lines) {
      if (!line.item_id) {
        continue
      }
      const orderId = itemIdToOrderId.get(line.item_id)
      if (!orderId) {
        continue
      }
      const amount = Number(line.amount) || 0
      commissionByOrderId.set(orderId, (commissionByOrderId.get(orderId) ?? 0) + amount)
    }
  }

  const grossRevenue = todaysOrders.reduce(
    (sum, order) => sum + order.summary.accounting_total,
    0
  )
  const commissionTotal = todaysOrders.reduce(
    (sum, order) => sum + (commissionByOrderId.get(order.id) ?? 0),
    0
  )

  return {
    orders_count: todaysOrders.length,
    gross_revenue: roundCurrency(grossRevenue),
    net_earnings: roundCurrency(grossRevenue - commissionTotal),
  }
}
