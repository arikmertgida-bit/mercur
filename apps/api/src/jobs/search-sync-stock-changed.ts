import type { Query } from '@medusajs/framework'
import { ICacheService, MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { reindexProductsById, resolveProductIdsFromInventoryItemIds } from '../lib/search/sync'

// Reconciliation safety net, NOT the primary sync path — see
// `search-sync-stock-drain.ts` and the `inventory-level-changed` subscriber
// for that. Every first-party inventory mutation site now emits
// `inventory_level.changed` the instant it happens, which the drain job
// picks up within a minute. This job exists only to catch the rare case
// where that emit was silently lost (e.g. a Redis blip between the write
// committing and the event firing) — it re-diffs `inventory_level.updated_at`
// directly, same as before, just on a much longer interval since it is no
// longer on the latency-critical path.
//
// Medusa's inventory-level update/adjust/batch workflows never emit a
// domain event themselves (`InventoryEvents.INVENTORY_LEVEL_UPDATED` is
// declared but unused by any of them, in this exact framework version) —
// this reconciliation pass is what still catches anything the explicit
// first-party emits miss.
const JOB_NAME = 'search-sync-stock-changed'
const CRON_SCHEDULE = '*/15 * * * *'
const CURSOR_CACHE_KEY = 'search:inventory-sync:last-cursor'
const FALLBACK_LOOKBACK_MS = 20 * 60 * 1000
const BATCH_LIMIT = 1000
// Pre-existing gap fixed while touching this file: ICacheService defaults to
// a 30-second ttl when none is passed, far shorter than this job's own
// 15-minute interval — the cursor was silently expiring before the next run
// ever read it, forcing every run back onto FALLBACK_LOOKBACK_MS instead of
// actually resuming from where the last run left off. Harmless at a
// 20-minute lookback vs. this job's 15-minute interval (still covers the
// gap), but wasteful and not what the cursor was for.
const CURSOR_TTL_SECONDS = 24 * 60 * 60

type ChangedInventoryLevel = {
  inventory_item_id: string
  updated_at: string
}

export default async function searchSyncStockChangedJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cache = container.resolve<ICacheService>(Modules.CACHE)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  try {
    const storedCursor = await cache.get<string>(CURSOR_CACHE_KEY)
    const since = storedCursor
      ? new Date(storedCursor)
      : new Date(Date.now() - FALLBACK_LOOKBACK_MS)

    const { data: changedLevels } = await query.graph({
      entity: 'inventory_level',
      fields: ['inventory_item_id', 'updated_at'],
      filters: { updated_at: { $gt: since } },
      pagination: { skip: 0, take: BATCH_LIMIT },
    })
    const levels = changedLevels as ChangedInventoryLevel[]

    if (!levels.length) {
      return
    }

    // Under the event-driven model this should almost always be empty by
    // the time the 15-minute reconciliation pass runs (the 1-minute drain
    // job already caught it). A non-empty diff here means some emit in
    // Phase 1's mutation-site wiring silently failed — worth knowing about,
    // not just silently self-healing.
    logger.warn(
      `[${JOB_NAME}] reconciliation found ${levels.length} inventory_level change(s) the event-driven drain missed — check inventory_level.changed emitters.`
    )

    const inventoryItemIds = Array.from(
      new Set(levels.map((level) => level.inventory_item_id))
    )
    const productIds = await resolveProductIdsFromInventoryItemIds(container, inventoryItemIds)
    await reindexProductsById(container, productIds)

    // Cursor only ever advances to what was actually processed — if this
    // batch hit BATCH_LIMIT, the next run picks up right where this one
    // left off rather than silently skipping the remainder.
    const latestUpdatedAt = levels.reduce(
      (latest, level) => (level.updated_at > latest ? level.updated_at : latest),
      levels[0].updated_at
    )
    await cache.set(CURSOR_CACHE_KEY, latestUpdatedAt, CURSOR_TTL_SECONDS)
  } catch (error) {
    logger.error(
      `[${JOB_NAME}] failed to sync stock changes to the search index:`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export const config = {
  name: JOB_NAME,
  schedule: CRON_SCHEDULE,
}
