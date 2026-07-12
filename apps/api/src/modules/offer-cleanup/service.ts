import { MedusaService } from '@medusajs/framework/utils'

/**
 * No data model — this module exists only to host the migrations that clean
 * up leftovers from the removed `offer` module: dropping the tables it left
 * behind (`migrations/Migration20260712100000.ts`) and deleting the orphaned
 * `price`/`price_rule` rows still scoped to deleted offers
 * (`migrations/Migration20260712120000.ts`).
 */
class OfferCleanupModuleService extends MedusaService({}) {}

export default OfferCleanupModuleService
