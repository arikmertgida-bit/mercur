import { Module } from '@medusajs/framework/utils'

import OfferCleanupModuleService from './service'

export const OFFER_CLEANUP_MODULE = 'offer_cleanup'
export { OfferCleanupModuleService }

export default Module(OFFER_CLEANUP_MODULE, {
  service: OfferCleanupModuleService,
})
