import { MiddlewareRoute } from '@medusajs/framework/http'
import { validateAndTransformQuery } from '@medusajs/framework'

import { storeSellerProductsQueryConfig } from './query-config'
import { StoreGetSellerProductsParams } from './validators'

export const storeSellerProductsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/sellers/:handle/products',
    middlewares: [
      validateAndTransformQuery(
        StoreGetSellerProductsParams,
        storeSellerProductsQueryConfig.list
      ),
    ],
  },
]
