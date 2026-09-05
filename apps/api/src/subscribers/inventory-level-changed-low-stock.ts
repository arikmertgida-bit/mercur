import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { evaluateLowStockForInventoryItems } from "../lib/low-stock"
import { syncSellerLowStockItemsWorkflow } from "../workflows/sync-seller-low-stock-items"
import { broadcastDashboardSync } from "../lib/messenger"

/**
 * Keeps the Vendor/Admin dashboards' "Azalan Stok" widget in sync with real
 * stock the instant a seller edits it, instead of only refreshing on
 * jobs/compute-seller-analytics.ts's 12h schedule — a product restocked to
 * at/above LOW_STOCK_THRESHOLD disappears from the widget immediately, and
 * one that drops below it appears immediately. `inventory_level.changed` is
 * Medusa's own core event, fired by every stock-mutating path uniformly
 * (a vendor's manual /inventory or /products/:handle/stock edit, an order
 * fulfillment/return, a reservation release, ...) — so this reacts the same
 * way no matter where the stock change came from.
 *
 * Beyond the DB snapshot, also pushes a live socket signal (see
 * lib/messenger.ts's broadcastDashboardSync) so an open Vendor Panel
 * dashboard refetches immediately instead of waiting for its ~30s poll —
 * the poll stays as a resilience fallback for a missed/offline socket.
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

    const affectedSellerIds = Array.from(new Set(evaluations.map((row) => row.seller_id)))
    await Promise.all(
      affectedSellerIds.map((sellerId) =>
        broadcastDashboardSync(sellerId, "inventory_changed")
      )
    )
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
