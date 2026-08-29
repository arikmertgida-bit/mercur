import { MiddlewareRoute } from '@medusajs/framework/http'
import { validateAndTransformQuery } from '@medusajs/framework'

import { storeCatalogFacetsQueryConfig } from './query-config'
import { StoreGetCatalogFacetsParams } from './validators'

export const storeCatalogFacetsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/catalog/facets',
    middlewares: [
      validateAndTransformQuery(StoreGetCatalogFacetsParams, storeCatalogFacetsQueryConfig.list),
    ],
  },
]
