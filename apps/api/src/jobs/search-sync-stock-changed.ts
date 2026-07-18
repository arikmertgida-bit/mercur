import type { Query } from '@medusajs/framework'
import { ICacheService, MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { reindexProductsById } from '../lib/search/sync'

// Medusa's inventory-level update/adjust/batch workflows never emit a
// domain event (`InventoryEvents.INVENTORY_LEVEL_UPDATED` is declared but
// unused by any of them, in this exact framework version) — so vendor
// edits, admin edits, and order-driven stock decrements can't be caught
// by a subscriber. This job is the single, comprehensive catch-all: it
// looks at what actually changed in `inventory_level` since it last ran
// and re-syncs only those products' search documents, regardless of what
// code path touched the stock.
const JOB_NAME = 'search-sync-stock-changed'
const CRON_SCHEDULE = '*/2 * * * *'
const CURSOR_CACHE_KEY = 'search:inventory-sync:last-cursor'
const FALLBACK_LOOKBACK_MS = 5 * 60 * 1000
const BATCH_LIMIT = 1000

type ChangedInventoryLevel = {
  inventory_item_id: string
  updated_at: string
}

type VariantInventoryItemLink = {
  variant_id: string | null
}

type VariantRow = {
  product_id: string | null
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

    const inventoryItemIds = Array.from(
      new Set(levels.map((level) => level.inventory_item_id))
    )

    // `inventory_items` on `product_variant` is a cross-module link, not a
    // plain foreign key — it can be *selected* in a nested field path, but
    // filtering a `product_variant` query by that nested path 500s
    // ("missing FROM-clause entry"), same as `product_seller` elsewhere in
    // this codebase needs its own two-hop resolution. Query the link table
    // directly for variant ids, then the variants for their product ids.
    const { data: links } = await query.graph({
      entity: 'product_variant_inventory_item',
      fields: ['variant_id'],
      filters: { inventory_item_id: inventoryItemIds },
    })
    const variantIds = Array.from(
      new Set(
        (links as VariantInventoryItemLink[])
          .map((link) => link.variant_id)
          .filter((id): id is string => !!id)
      )
    )

    if (!variantIds.length) {
      return
    }

    const { data: variants } = await query.graph({
      entity: 'product_variant',
      fields: ['product_id'],
      filters: { id: variantIds },
    })

    const productIds = Array.from(
      new Set(
        (variants as VariantRow[])
          .map((variant) => variant.product_id)
          .filter((id): id is string => !!id)
      )
    )

    await reindexProductsById(container, productIds)

    // Cursor only ever advances to what was actually processed — if this
    // batch hit BATCH_LIMIT, the next run picks up right where this one
    // left off rather than silently skipping the remainder.
    const latestUpdatedAt = levels.reduce(
      (latest, level) => (level.updated_at > latest ? level.updated_at : latest),
      levels[0].updated_at
    )
    await cache.set(CURSOR_CACHE_KEY, latestUpdatedAt)
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
