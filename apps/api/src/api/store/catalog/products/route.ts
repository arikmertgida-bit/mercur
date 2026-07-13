import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework'
import { ContainerRegistrationKeys, QueryContext } from '@medusajs/framework/utils'
import { MercurModules } from '@mercurjs/types'
import { SearchModuleService } from '@mercurjs/core/modules/search'

import { hydrateOrderedProducts } from '../../../../lib/catalog-hydration'
import { toFacetDistribution } from '../../../../lib/facet-distribution'
import { toStringArray } from '../../../../lib/query-params'
import { resolveRegionByCountryCode } from '../../../../lib/resolve-region'
import { MeilisearchProviderFilters } from '../../../../modules/search-providers/meilisearch/types'
import { StoreGetCatalogProductsParamsType } from './validators'

export const GET = async (
  req: MedusaRequest<never, StoreGetCatalogProductsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const search = req.scope.resolve<SearchModuleService>(MercurModules.SEARCH)

  const {
    limit,
    offset,
    country_code,
    collection_id,
    q,
    min_price,
    max_price,
    sort,
    category_id,
    size,
    color,
    condition,
  } = req.validatedQuery

  const region = await resolveRegionByCountryCode(query, country_code)

  const filters: MeilisearchProviderFilters = {
    collection_ids: collection_id ? [collection_id] : undefined,
    category_ids: toStringArray(category_id),
    size_values: toStringArray(size),
    color_values: toStringArray(color),
    condition_values: toStringArray(condition),
    price_min: min_price,
    price_max: max_price,
    sort,
  }

  const searchResult = await search.search({
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

  const products = await hydrateOrderedProducts(query, orderedIds, pricingContext)

  res.json({
    products,
    count: searchResult.count,
    offset,
    limit,
    facetDistribution: toFacetDistribution(searchResult.facets),
  })
}
