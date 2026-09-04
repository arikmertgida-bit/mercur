import { ICacheService, MedusaContainer } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

// Backing store for the event-driven inventory->search sync: the
// `inventory-level-changed` subscriber enqueues item ids here the instant
// Medusa emits the event, and the `search-sync-stock-drain` job (every
// minute) pops the whole set and reindexes exactly those items — no DB diff
// query, no cursor, no BATCH_LIMIT ceiling.
const PENDING_ITEMS_CACHE_KEY = 'search:inventory-sync:pending-items'
const PENDING_SET_LOCK_KEY = 'search-sync-pending-set'

// Medusa's ICacheService defaults to a 30-SECOND ttl when none is passed
// (`@medusajs/cache-redis`'s `DEFAULT_CACHE_TIME`) — shorter than the drain
// job's 1-minute interval, so an un-ttl'd entry would silently expire and
// vanish before the job ever reads it (confirmed live: the pending set was
// empty on every drain run until this was added). Generous on purpose —
// outliving the drain job by a wide margin is harmless (the job clears the
// key the moment it actually reads it), while a too-short ttl silently
// drops real stock changes.
const PENDING_SET_TTL_SECONDS = 3600

// A plain cache get-then-set is a lost-update race under concurrent
// subscriber invocations (the exact bug class this project's own inventory
// audit flagged for reservation writes) — wrapped in the same
// Modules.LOCKING primitive `reserveInventoryStep` already uses elsewhere.
// This never touches the checkout request path: event-bus-redis delivers to
// subscribers out of band, so lock contention here only affects background
// worker throughput, never customer-facing latency.
export const enqueuePendingInventoryItems = async (
  container: MedusaContainer,
  inventoryItemIds: string[]
): Promise<void> => {
  const ids = Array.from(new Set(inventoryItemIds.filter(Boolean)))
  if (!ids.length) {
    return
  }

  const cache = container.resolve<ICacheService>(Modules.CACHE)
  const locking = container.resolve(Modules.LOCKING)

  await locking.execute([PENDING_SET_LOCK_KEY], async () => {
    const existing = (await cache.get<string[]>(PENDING_ITEMS_CACHE_KEY)) ?? []
    const merged = Array.from(new Set([...existing, ...ids]))
    await cache.set(PENDING_ITEMS_CACHE_KEY, merged, PENDING_SET_TTL_SECONDS)
  })
}

// Atomically reads and clears the pending set. Called only from inside the
// drain loader's own distributed-lock section (a different key — see
// `inventory-search-drain.ts`), so no additional locking is needed here.
export const drainPendingInventoryItems = async (
  container: MedusaContainer
): Promise<string[]> => {
  const cache = container.resolve<ICacheService>(Modules.CACHE)
  const pending = (await cache.get<string[]>(PENDING_ITEMS_CACHE_KEY)) ?? []
  if (pending.length) {
    await cache.set(PENDING_ITEMS_CACHE_KEY, [], PENDING_SET_TTL_SECONDS)
  }
  return pending
}
