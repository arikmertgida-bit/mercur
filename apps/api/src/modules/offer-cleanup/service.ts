import { MedusaService } from '@medusajs/framework/utils'

/**
 * No data model — this module exists only to host the migration that drops
 * the tables left behind by the removed `offer` module (see
 * `migrations/Migration20260712100000.ts`).
 */
class OfferCleanupModuleService extends MedusaService({}) {}

export default OfferCleanupModuleService
