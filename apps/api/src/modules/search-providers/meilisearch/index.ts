import { ModuleProvider } from '@medusajs/framework/utils'
import { MercurModules } from '@mercurjs/types'

import MeilisearchSearchProvider from './service'

export default ModuleProvider(MercurModules.SEARCH, {
  services: [MeilisearchSearchProvider],
})
