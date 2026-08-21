import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework'
import { ContainerRegistrationKeys, QueryContext } from '@medusajs/framework/utils'

import { hydrateOrderedProducts } from '../../../../lib/catalog-hydration'
import { loadCatalogPromotionPricing } from '../../../../lib/catalog-promotions'
import { toFacetDistribution } from '../../../../lib/facet-distribution'
import { toStringArray } from '../../../../lib/query-params'
import { resolveRegionByCountryCode } from '../../../../lib/resolve-region'
import { searchProducts } from '../../../../lib/search/meilisearch-client'
import { MeilisearchProviderFilters } from '../../../../lib/search/meilisearch-types'
import { StoreGetCatalogProductsParamsType } from './validators'

export const GET = async (
  req: MedusaRequest<never, StoreGetCatalogProductsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

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
    promotion_type,
    campaign_id,
  } = req.validatedQuery

  const region = await resolveRegionByCountryCode(query, country_code)

  const filters: MeilisearchProviderFilters = {
    collection_ids: collection_id ? [collection_id] : undefined,
    category_ids: toStringArray(category_id),
    size_values: toStringArray(size),
    color_values: toStringArray(color),
    condition_values: toStringArray(condition),
    promotion_types: toStringArray(promotion_type),
    campaign_id,
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

  const products = await hydrateOrderedProducts(query, orderedIds, pricingContext)

  const { promotionsByProductId, referencePrices } = await loadCatalogPromotionPricing(
    req.scope,
    query,
    products,
    region
  )

  res.json({
    products,
    count: searchResult.count,
    offset,
    limit,
    facetDistribution: toFacetDistribution(searchResult.facets),
    promotions: promotionsByProductId,
    reference_prices: referencePrices,
  })
}
