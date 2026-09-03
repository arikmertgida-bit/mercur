import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { SELLER_ANALYTICS_MODULE } from "../../modules/seller-analytics"
import SellerAnalyticsModuleService from "../../modules/seller-analytics/service"

export type UpsertPlatformDailyStatInput = {
  date: string
  currency_code: string
  orders_count: number
  gross_revenue: number
  commission_earnings: number
  total_products: number
  total_sellers: number
  total_customers: number
  computed_at: Date
}

export const upsertPlatformDailyStatStep = createStep(
  "upsert-platform-daily-stat",
  async (data: UpsertPlatformDailyStatInput | undefined, { container }) => {
    const service = container.resolve<SellerAnalyticsModuleService>(
      SELLER_ANALYTICS_MODULE
    )

    if (!data) {
      return new StepResponse([], [])
    }

    const existing = await service.listPlatformDailyStats({
      date: data.date,
      currency_code: data.currency_code,
    })
    if (existing.length > 0) {
      await service.deletePlatformDailyStats(existing.map((row) => row.id))
    }

    const created = await service.createPlatformDailyStats([data])
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
    await service.deletePlatformDailyStats(ids)
  }
)
