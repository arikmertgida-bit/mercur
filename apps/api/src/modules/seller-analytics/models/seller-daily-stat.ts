import { model } from "@medusajs/framework/utils"

// One row per seller per calendar day (Europe/Istanbul), written by the
// compute-seller-analytics job every 12h. Vendor/admin dashboards read this
// table directly instead of aggregating orders + commission lines live on
// every page load — see apps/api/src/jobs/compute-seller-analytics.ts.
const SellerDailyStat = model.define("seller_daily_stat", {
  id: model.id({ prefix: "sdstat" }).primaryKey(),
  seller_id: model.text(),
  // "YYYY-MM-DD"
  date: model.text(),
  currency_code: model.text(),
  orders_count: model.number(),
  gross_revenue: model.bigNumber(),
  net_earnings: model.bigNumber(),
  computed_at: model.dateTime(),
})

export default SellerDailyStat
