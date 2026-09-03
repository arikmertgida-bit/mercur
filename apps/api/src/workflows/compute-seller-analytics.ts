import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  UpsertSellerDailyStatInput,
  upsertSellerDailyStatsStep,
} from "./steps/upsert-seller-daily-stats"
import {
  ReplaceSellerLowStockItemsInput,
  replaceSellerLowStockItemsStep,
} from "./steps/replace-seller-low-stock-items"
import {
  UpsertPlatformDailyStatInput,
  upsertPlatformDailyStatStep,
} from "./steps/upsert-platform-daily-stat"

export type ComputeSellerAnalyticsWorkflowInput = {
  sellerDailyStats: UpsertSellerDailyStatInput[]
  lowStock: ReplaceSellerLowStockItemsInput
  platformDailyStat?: UpsertPlatformDailyStatInput
}

// Materialization workflow behind the Vendor/Admin dashboards' 12h-cached
// analytics (earnings, low stock, platform rollup). Invoked once per seller
// batch by apps/api/src/jobs/compute-seller-analytics.ts, and once more at
// the end of the run with only platformDailyStat set. Order counts are
// intentionally NOT part of this workflow — those stay live, read straight
// from the order module on every dashboard request (see
// apps/api/src/api/vendor/dashboard and apps/api/src/api/admin/dashboard).
export const computeSellerAnalyticsWorkflow = createWorkflow(
  "compute-seller-analytics",
  function (input: ComputeSellerAnalyticsWorkflowInput) {
    const sellerStats = upsertSellerDailyStatsStep(input.sellerDailyStats)
    const lowStock = replaceSellerLowStockItemsStep(input.lowStock)
    const platformStat = upsertPlatformDailyStatStep(input.platformDailyStat)

    return new WorkflowResponse({ sellerStats, lowStock, platformStat })
  }
)
