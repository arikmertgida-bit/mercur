import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { hydrateOrderedProducts } from '../../../../lib/catalog-hydration'
import { getPopularCategories } from '../../../../lib/popular-categories'
import { searchProducts } from '../../../../lib/search/meilisearch-client'
import { StoreGetSearchSuggestParamsType } from './validators'

export const GET = async (
  req: MedusaRequest<never, StoreGetSearchSuggestParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { q, limit } = req.validatedQuery
  const trimmedQuery = q?.trim() ?? ''

  if (trimmedQuery.length < 3) {
    const popularCategories = await getPopularCategories(query, limit)
    return res.json({ products: [], popular_categories: popularCategories })
  }

  const searchResult = await searchProducts({
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
