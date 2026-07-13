import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MercurModules } from '@mercurjs/types'
import { SearchModuleService } from '@mercurjs/core/modules/search'

import { hydrateOrderedProducts } from '../../../../lib/catalog-hydration'
import { getPopularCategoryNames } from '../../../../lib/popular-categories'
import { StoreGetSearchSuggestParamsType } from './validators'

export const GET = async (
  req: MedusaRequest<never, StoreGetSearchSuggestParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const search = req.scope.resolve<SearchModuleService>(MercurModules.SEARCH)

  const { q, limit } = req.validatedQuery
  const trimmedQuery = q?.trim() ?? ''

  if (trimmedQuery.length < 3) {
    const popularCategories = await getPopularCategoryNames(query, limit)
    return res.json({ products: [], popular_categories: popularCategories })
  }

  const searchResult = await search.search({
    q: trimmedQuery,
    limit,
    offset: 0,
    filters: {},
  })

  const orderedIds = searchResult.hits.map((hit) => hit.id)
  const hydrated = await hydrateOrderedProducts(query, orderedIds)

  const products = hydrated.map((product) => ({
    id: product.id,
    title: product.title,
    handle: product.handle ?? '',
    thumbnail: product.thumbnail,
    seller: product.seller
      ? { name: product.seller.name, handle: product.seller.handle }
      : null,
  }))

  res.json({ products, count: products.length, offset: 0, limit })
}
