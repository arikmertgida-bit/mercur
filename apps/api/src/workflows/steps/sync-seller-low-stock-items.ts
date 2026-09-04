import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { SELLER_ANALYTICS_MODULE } from "../../modules/seller-analytics"
import SellerAnalyticsModuleService from "../../modules/seller-analytics/service"
import { LowStockEvaluation } from "../../lib/low-stock"

export type SyncSellerLowStockItemsInput = LowStockEvaluation[]

// Reacts to a live inventory-level change for one or more specific
// (seller, inventory item) pairs — unlike replaceSellerLowStockItemsStep's
// full-batch replace (used by the 12h scheduled snapshot, which reasons
// about a seller's whole catalog at once), this only ever touches the exact
// rows it was given, leaving every other one of that seller's low-stock
// rows untouched.
export const syncSellerLowStockItemsStep = createStep(
  "sync-seller-low-stock-items",
  async (evaluations: SyncSellerLowStockItemsInput, { container }) => {
    const service = container.resolve<SellerAnalyticsModuleService>(
      SELLER_ANALYTICS_MODULE
    )

    if (evaluations.length === 0) {
      return new StepResponse([], [])
    }

    const existing = await service.listSellerLowStockItems({
      $or: evaluations.map((row) => ({
        seller_id: row.seller_id,
        inventory_item_id: row.inventory_item_id,
      })),
    })
    if (existing.length > 0) {
      await service.deleteSellerLowStockItems(existing.map((row) => row.id))
    }

    const toCreate = evaluations.filter((row) => row.is_low_stock)
    if (toCreate.length === 0) {
      return new StepResponse([], [])
    }

    const now = new Date()
    const created = await service.createSellerLowStockItems(
      toCreate.map((row) => ({
        seller_id: row.seller_id,
        inventory_item_id: row.inventory_item_id,
        product_title: row.product_title,
        sku: row.sku,
        thumbnail: row.thumbnail,
        available_quantity: row.available_quantity,
        computed_at: now,
      }))
    )

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
    await service.deleteSellerLowStockItems(ids)
  }
)
