import { model } from "@medusajs/framework/utils"

// One row per calendar day (Europe/Istanbul): the platform-wide rollup
// consumed by the admin dashboard, computed once per job run by summing
// that run's seller_daily_stat rows — see
// apps/api/src/jobs/compute-seller-analytics.ts.
const PlatformDailyStat = model.define("platform_daily_stat", {
  id: model.id({ prefix: "pdstat" }).primaryKey(),
  // "YYYY-MM-DD"
  date: model.text(),
  currency_code: model.text(),
  orders_count: model.number(),
  gross_revenue: model.bigNumber(),
  commission_earnings: model.bigNumber(),
  total_products: model.number(),
  total_sellers: model.number(),
  total_customers: model.number(),
  computed_at: model.dateTime(),
})

export default PlatformDailyStat
