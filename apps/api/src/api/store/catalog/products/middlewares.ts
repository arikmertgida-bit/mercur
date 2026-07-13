import { MiddlewareRoute } from '@medusajs/framework/http'
import { validateAndTransformQuery } from '@medusajs/framework'

import { storeCatalogProductsQueryConfig } from './query-config'
import { StoreGetCatalogProductsParams } from './validators'

export const storeCatalogProductsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/catalog/products',
    middlewares: [
      validateAndTransformQuery(
        StoreGetCatalogProductsParams,
        storeCatalogProductsQueryConfig.list
      ),
    ],
  },
]
