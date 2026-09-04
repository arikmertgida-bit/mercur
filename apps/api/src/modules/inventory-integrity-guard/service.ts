import { MedusaService } from '@medusajs/framework/utils'

/**
 * No data model — this module exists only to host the migration that adds
 * a PostgreSQL-native second defense layer against inventory oversell
 * (`fn_enforce_reservation_limit()` / `trg_enforce_reservation_limit` on
 * `reservation_item`), independent of the Redis-backed distributed lock
 * `reserveInventoryStep` already relies on. See the 2026-09-04 inventory
 * race-condition audit and Phase 2 of the master implementation plan.
 */
class InventoryIntegrityGuardModuleService extends MedusaService({}) {}

export default InventoryIntegrityGuardModuleService
