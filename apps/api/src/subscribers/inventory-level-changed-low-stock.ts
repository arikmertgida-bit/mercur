import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { evaluateLowStockForInventoryItems } from "../lib/low-stock"
import { syncSellerLowStockItemsWorkflow } from "../workflows/sync-seller-low-stock-items"

/**
 * Keeps the Vendor/Admin dashboards' "Azalan Stok" widget in sync with real
 * stock the instant a seller edits it, instead of only refreshing on
 * jobs/compute-seller-analytics.ts's 12h schedule — a product restocked
 * above LOW_STOCK_THRESHOLD disappears from the widget immediately, and one
 * that drops to/below it appears immediately.
 */
export default async function inventoryLevelChangedLowStockHandler({
  event,
  container,
}: SubscriberArgs<{ inventory_item_ids: string[] }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const inventoryItemIds = event.data.inventory_item_ids ?? []
    if (inventoryItemIds.length === 0) {
      return
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const evaluations = await evaluateLowStockForInventoryItems(query, inventoryItemIds)

    await syncSellerLowStockItemsWorkflow(container).run({ input: evaluations })
  } catch (error) {
    logger.error(
      "[inventory-level-changed-low-stock] failed to sync low-stock snapshot:",
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "inventory_level.changed",
  context: {
    subscriberId: "inventory-level-changed-low-stock-handler",
  },
}
