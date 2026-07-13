import { Module } from '@medusajs/framework/utils'

import AttributeLegacyCleanupModuleService from './service'

export const ATTRIBUTE_LEGACY_CLEANUP_MODULE = 'attribute_legacy_cleanup'
export { AttributeLegacyCleanupModuleService }

export default Module(ATTRIBUTE_LEGACY_CLEANUP_MODULE, {
  service: AttributeLegacyCleanupModuleService,
})
