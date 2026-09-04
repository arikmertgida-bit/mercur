import { ILockingModule, MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { drainPendingInventoryItems } from '../lib/search/inventory-pending-set'
import { reindexProductsById, resolveProductIdsFromInventoryItemIds } from '../lib/search/sync'

// The event-driven counterpart to `search-sync-stock-changed.ts`: every first
// -party mutation site (checkout reservation, fulfillment/return stock
// decrement, vendor/admin manual edits — see `inventory_level.changed`
// emitters) pushes changed inventory_item_ids into a Redis-backed pending set
// the instant they happen. This job just drains that set on a short,
// bounded schedule — no DB diff query, no cursor, no BATCH_LIMIT — so lag
// under sustained high-frequency stock changes stays flat instead of
// growing unboundedly.
const JOB_NAME = 'search-sync-stock-drain'
const CRON_SCHEDULE = '* * * * *'
const DRAIN_LOCK_KEY = 'search-sync-drain'

export default async function searchSyncStockDrainJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const locking = container.resolve<ILockingModule>(Modules.LOCKING)

  try {
    // Only one replica's tick does the work per run when the backend scales
    // horizontally — the same Redis-backed lock `reserveInventoryStep` uses,
    // so the rest no-op safely instead of double-draining.
    await locking.execute([DRAIN_LOCK_KEY], async () => {
      const pendingInventoryItemIds = await drainPendingInventoryItems(container)
      if (!pendingInventoryItemIds.length) {
        return
      }

      const productIds = await resolveProductIdsFromInventoryItemIds(
        container,
        pendingInventoryItemIds
      )
      await reindexProductsById(container, productIds)
    })
  } catch (error) {
    logger.error(
      `[${JOB_NAME}] failed to drain pending inventory items to the search index:`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export const config = {
  name: JOB_NAME,
  schedule: CRON_SCHEDULE,
}
