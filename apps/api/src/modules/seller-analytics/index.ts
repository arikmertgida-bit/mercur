import { Module } from "@medusajs/framework/utils"
import SellerAnalyticsModuleService from "./service"

export const SELLER_ANALYTICS_MODULE = "sellerAnalytics"

// Materialized dashboard data (Vendor + Admin "Gösterge Paneli"): orders
// are read live from the order module, everything else (earnings, low
// stock, platform rollups) is written here every 12h by
// apps/api/src/jobs/compute-seller-analytics.ts, so dashboard reads never
// pay the cost of a live commission/inventory aggregation.
export default Module(SELLER_ANALYTICS_MODULE, {
  service: SellerAnalyticsModuleService,
})
