import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import type {} from "@mercurjs/core/types/seller-context"

import { SELLER_ANALYTICS_MODULE } from "../../../modules/seller-analytics"
import type SellerAnalyticsModuleService from "../../../modules/seller-analytics/service"
import { resolveLiveOrderCounts, VendorLiveOrderCounts } from "./helpers"

const TREND_DAYS = 14

export type VendorDashboardTrendPoint = {
  date: string
  orders_count: number
  gross_revenue: number
  net_earnings: number
}

export type VendorDashboardLowStockItem = {
  inventory_item_id: string
  product_title: string
  sku: string | null
  available_quantity: number
}

export type VendorDashboardResponse = {
  orders: VendorLiveOrderCounts
  earnings: {
    currency_code: string
    today: {
      orders_count: number
      gross_revenue: number
      net_earnings: number
    } | null
    trend: VendorDashboardTrendPoint[]
  }
  low_stock: VendorDashboardLowStockItem[]
  analytics_computed_at: string | null
}

/**
 * GET /vendor/dashboard
 *
 * Orders (today/this_week/this_month) are computed live, bounded to the
 * authenticated seller (cheap — see ./helpers.ts). Earnings, the trend
 * chart, and low stock are read from tables materialized every 12h by
 * apps/api/src/jobs/compute-seller-analytics.ts — never aggregated live,
 * so this endpoint stays fast at any seller-catalog size.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorDashboardResponse>
) => {
  if (!req.seller_context?.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    )
  }
  const sellerId = req.seller_context.seller_id

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const analyticsService = req.scope.resolve<SellerAnalyticsModuleService>(
    SELLER_ANALYTICS_MODULE
  )

  const now = new Date()

  const [orders, dailyStats, lowStockRows] = await Promise.all([
    resolveLiveOrderCounts(query, sellerId, now),
    analyticsService.listSellerDailyStats(
      { seller_id: sellerId },
      { order: { date: "DESC" }, take: TREND_DAYS }
    ),
    analyticsService.listSellerLowStockItems(
      { seller_id: sellerId },
      { order: { available_quantity: "ASC" }, take: 10 }
    ),
  ])

  const sortedStats = [...dailyStats].sort((a, b) => a.date.localeCompare(b.date))
  const latest = dailyStats[0] ?? null
  const currencyCode = latest?.currency_code ?? "try"

  res.json({
    orders,
    earnings: {
      currency_code: currencyCode,
      today: latest
        ? {
            orders_count: latest.orders_count,
            gross_revenue: Number(latest.gross_revenue),
            net_earnings: Number(latest.net_earnings),
          }
        : null,
      trend: sortedStats.map((row) => ({
        date: row.date,
        orders_count: row.orders_count,
        gross_revenue: Number(row.gross_revenue),
        net_earnings: Number(row.net_earnings),
      })),
    },
    low_stock: lowStockRows.map((row) => ({
      inventory_item_id: row.inventory_item_id,
      product_title: row.product_title,
      sku: row.sku,
      available_quantity: row.available_quantity,
    })),
    analytics_computed_at: latest ? new Date(latest.computed_at).toISOString() : null,
  })
}
