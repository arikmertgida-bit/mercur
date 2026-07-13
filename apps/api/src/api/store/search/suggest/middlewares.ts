import { MiddlewareRoute } from '@medusajs/framework/http'
import { validateAndTransformQuery } from '@medusajs/framework'

import { storeSearchSuggestQueryConfig } from './query-config'
import { StoreGetSearchSuggestParams } from './validators'

export const storeSearchSuggestMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/search/suggest',
    middlewares: [
      validateAndTransformQuery(
        StoreGetSearchSuggestParams,
        storeSearchSuggestQueryConfig.list
      ),
    ],
  },
]
