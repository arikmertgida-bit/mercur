import { Module } from '@medusajs/framework/utils'

import InventoryIntegrityGuardModuleService from './service'

export const INVENTORY_INTEGRITY_GUARD_MODULE = 'inventory_integrity_guard'
export { InventoryIntegrityGuardModuleService }

export default Module(INVENTORY_INTEGRITY_GUARD_MODULE, {
  service: InventoryIntegrityGuardModuleService,
})
