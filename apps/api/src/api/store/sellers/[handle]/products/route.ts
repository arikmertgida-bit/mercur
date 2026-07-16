import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError, QueryContext } from '@medusajs/framework/utils'

import { hydrateOrderedProducts } from '../../../../../lib/catalog-hydration'
import { toFacetDistribution } from '../../../../../lib/facet-distribution'
import { toStringArray } from '../../../../../lib/query-params'
import { resolveRegionByCountryCode } from '../../../../../lib/resolve-region'
import { getSellerCategories } from '../../../../../lib/seller-categories'
import { searchProducts } from '../../../../../lib/search/meilisearch-client'
import { MeilisearchProviderFilters } from '../../../../../lib/search/meilisearch-types'
import { StoreGetSellerProductsParamsType } from './validators'

async function resolveSellerIdByHandle(query: Query, handle: string): Promise<string> {
  const { data: sellers } = await query.graph({
    entity: 'seller',
    filters: { handle },
    fields: ['id'],
  })

  const seller = sellers[0]
  if (!seller) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Seller with handle: ${handle} was not found`
    )
  }

  return seller.id
}

export const GET = async (
  req: MedusaRequest<never, StoreGetSellerProductsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const handle = req.params.handle

  const {
    limit,
    offset,
    country_code,
    include_categories,
    q,
    min_price,
    max_price,
    sort,
    category_id,
    size,
    color,
    condition,
  } = req.validatedQuery

  const [region, sellerId] = await Promise.all([
    resolveRegionByCountryCode(query, country_code),
    resolveSellerIdByHandle(query, handle),
  ])

  const filters: MeilisearchProviderFilters = {
    seller_handle: handle,
    category_ids: toStringArray(category_id),
    size_values: toStringArray(size),
    color_values: toStringArray(color),
    condition_values: toStringArray(condition),
    price_min: min_price,
    price_max: max_price,
    sort,
  }

  const searchResult = await searchProducts({
    q,
    limit,
    offset,
    filters,
    context: region ? { region_id: region.id } : undefined,
  })

  const orderedIds = searchResult.hits.map((hit) => hit.id)

  const pricingContext = region
    ? QueryContext({ currency_code: region.currency_code, region_id: region.id })
    : undefined

  const [products, categories] = await Promise.all([
    hydrateOrderedProducts(query, orderedIds, pricingContext),
    include_categories ? getSellerCategories(query, sellerId) : Promise.resolve(undefined),
  ])

  res.json({
    products,
    count: searchResult.count,
    offset,
    limit,
    ...(categories ? { categories } : {}),
    facetDistribution: toFacetDistribution(searchResult.facets),
  })
}
