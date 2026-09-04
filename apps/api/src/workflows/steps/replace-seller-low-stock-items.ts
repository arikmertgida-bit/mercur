import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { SELLER_ANALYTICS_MODULE } from "../../modules/seller-analytics"
import SellerAnalyticsModuleService from "../../modules/seller-analytics/service"

export type ReplaceSellerLowStockItemsInput = {
  sellerIds: string[]
  items: {
    seller_id: string
    inventory_item_id: string
    product_title: string
    sku: string | null
    thumbnail: string | null
    available_quantity: number
    computed_at: Date
  }[]
}

// Full replace, not merge: each job run is a fresh top-N snapshot, so a
// seller's previous rows must be gone even if a formerly-low item is no
// longer eligible this run.
export const replaceSellerLowStockItemsStep = createStep(
  "replace-seller-low-stock-items",
  async ({ sellerIds, items }: ReplaceSellerLowStockItemsInput, { container }) => {
    const service = container.resolve<SellerAnalyticsModuleService>(
      SELLER_ANALYTICS_MODULE
    )

    if (sellerIds.length === 0) {
      return new StepResponse([], [])
    }

    const existing = await service.listSellerLowStockItems({
      seller_id: sellerIds,
    })
    if (existing.length > 0) {
      await service.deleteSellerLowStockItems(existing.map((row) => row.id))
    }

    if (items.length === 0) {
      return new StepResponse([], [])
    }

    const created = await service.createSellerLowStockItems(items)
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
