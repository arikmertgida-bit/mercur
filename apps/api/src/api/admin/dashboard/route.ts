import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import { SELLER_ANALYTICS_MODULE } from "../../../modules/seller-analytics"
import type SellerAnalyticsModuleService from "../../../modules/seller-analytics/service"
import { getIstanbulDateString } from "../../../lib/reference-price"
import { AdminLiveOrderCounts, resolveLiveAdminOrderCounts } from "./helpers"

const TREND_DAYS = 14

export type AdminDashboardTrendPoint = {
  date: string
  orders_count: number
  gross_revenue: number
  commission_earnings: number
}

export type AdminDashboardResponse = {
  orders: AdminLiveOrderCounts
  earnings: {
    currency_code: string
    today: {
      orders_count: number
      gross_revenue: number
      commission_earnings: number
    }
    trend: AdminDashboardTrendPoint[]
  }
  totals: {
    total_products: number
    total_sellers: number
    total_customers: number
  }
  low_stock_count: number
  analytics_computed_at: string | null
}

/**
 * GET /admin/dashboard
 *
 * Platform-wide equivalent of GET /vendor/dashboard. Orders (today/
 * this_week/this_month) are three live, index-bounded COUNT queries (see
 * ./helpers.ts). Earnings, the trend chart, product/seller/customer
 * totals, and the low-stock count are read straight from tables
 * materialized every 12h by apps/api/src/jobs/compute-seller-analytics.ts
 * — never aggregated live across the whole marketplace.
 *
 * Unlike the vendor dashboard's "today" earnings (bounded to one seller's
 * handful of orders, so cheap to recompute live — see
 * apps/vendor/dashboard/helpers.ts), a platform-wide "today" spans every
 * seller's orders and is exactly the aggregation
 * compute-seller-analytics.ts already batches through every 12h; redoing
 * that live on each admin dashboard load would scale with total marketplace
 * order volume, not one seller's, so it stays materialized. What's fixed
 * here instead is the mislabeling: the freshest platform_daily_stat row is
 * only trusted as "today" once it's actually dated today (Istanbul) — a row
 * still sitting on a previous day (before the job's next run, or if a run
 * is ever missed) reports zero instead of silently carrying that day's
 * total into today's figures.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminDashboardResponse>
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const analyticsService = req.scope.resolve<SellerAnalyticsModuleService>(
    SELLER_ANALYTICS_MODULE
  )

  const now = new Date()

  const [orders, platformStats, lowStockCountResult] = await Promise.all([
    resolveLiveAdminOrderCounts(query, now),
    analyticsService.listPlatformDailyStats(
      {},
      { order: { date: "DESC" }, take: TREND_DAYS }
    ),
    analyticsService.listAndCountSellerLowStockItems({}),
  ])

  const sortedStats = [...platformStats].sort((a, b) => a.date.localeCompare(b.date))
  const latest = platformStats[0] ?? null
  const todayDate = getIstanbulDateString(now)
  const todayStats = latest?.date === todayDate ? latest : null
  const currencyCode = latest?.currency_code ?? "try"
  const [, lowStockCount] = lowStockCountResult

  res.json({
    orders,
    earnings: {
      currency_code: currencyCode,
      today: todayStats
        ? {
            orders_count: todayStats.orders_count,
            gross_revenue: Number(todayStats.gross_revenue),
            commission_earnings: Number(todayStats.commission_earnings),
          }
        : { orders_count: 0, gross_revenue: 0, commission_earnings: 0 },
      trend: sortedStats.map((row) => ({
        date: row.date,
        orders_count: row.orders_count,
        gross_revenue: Number(row.gross_revenue),
        commission_earnings: Number(row.commission_earnings),
      })),
    },
    totals: {
      total_products: latest?.total_products ?? 0,
      total_sellers: latest?.total_sellers ?? 0,
      total_customers: latest?.total_customers ?? 0,
    },
    low_stock_count: lowStockCount,
    analytics_computed_at: latest ? new Date(latest.computed_at).toISOString() : null,
  })
}
