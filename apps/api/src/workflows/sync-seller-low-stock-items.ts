import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  SyncSellerLowStockItemsInput,
  syncSellerLowStockItemsStep,
} from "./steps/sync-seller-low-stock-items"

// Invoked by subscribers/inventory-level-changed-low-stock.ts on every
// `inventory_level.changed` event — keeps the Vendor/Admin dashboards'
// "Azalan Stok" widget in sync with real stock in between
// compute-seller-analytics.ts's 12h scheduled runs.
export const syncSellerLowStockItemsWorkflow = createWorkflow(
  "sync-seller-low-stock-items",
  function (input: SyncSellerLowStockItemsInput) {
    return new WorkflowResponse(syncSellerLowStockItemsStep(input))
  }
)
