import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { SELLER_ANALYTICS_MODULE } from "../../modules/seller-analytics"
import SellerAnalyticsModuleService from "../../modules/seller-analytics/service"

export type UpsertSellerDailyStatInput = {
  seller_id: string
  date: string
  currency_code: string
  orders_count: number
  gross_revenue: number
  net_earnings: number
  computed_at: Date
}

export const upsertSellerDailyStatsStep = createStep(
  "upsert-seller-daily-stats",
  async (data: UpsertSellerDailyStatInput[], { container }) => {
    const service = container.resolve<SellerAnalyticsModuleService>(
      SELLER_ANALYTICS_MODULE
    )

    if (data.length === 0) {
      return new StepResponse([], [])
    }

    const existing = await service.listSellerDailyStats({
      $or: data.map((row) => ({
        seller_id: row.seller_id,
        date: row.date,
        currency_code: row.currency_code,
      })),
    })
    if (existing.length > 0) {
      await service.deleteSellerDailyStats(existing.map((row) => row.id))
    }

    const created = await service.createSellerDailyStats(data)
    return new StepResponse(
      created,
      created.map((row) => row.id)
    )
  },
  async (ids: string[] | undefined, { container }) => {
    if (!ids?.length) {
      return
    }
    const service = container.resolve<SellerAnalyticsModuleService>(
      SELLER_ANALYTICS_MODULE
    )
    await service.deleteSellerDailyStats(ids)
  }
)
