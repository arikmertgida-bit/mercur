import { MedusaService } from '@medusajs/framework/utils'

/**
 * No data model — this module exists only to host the migration that drops
 * the tables left behind by the pre-2026-07 `attribute`/`vendor_product_attribute`
 * modules, superseded by `product-attribute`
 * (`packages/core/src/modules/product-attribute`). See
 * `migrations/Migration20260713100000.ts`.
 */
class AttributeLegacyCleanupModuleService extends MedusaService({}) {}

export default AttributeLegacyCleanupModuleService
