import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

import { toStringArray } from '../../../../lib/query-params'
import { searchCatalogFacetValues } from '../../../../lib/search/meilisearch-client'
import { MeilisearchProviderFilters } from '../../../../lib/search/meilisearch-types'
import { StoreGetCatalogFacetsParamsType } from './validators'

export const GET = async (
  req: MedusaRequest<never, StoreGetCatalogFacetsParamsType>,
  res: MedusaResponse
) => {
  const {
    facet,
    search,
    collection_id,
    category_id,
    type_id,
    tag_id,
    size,
    color,
    condition,
    promotion_type,
    min_price,
    max_price,
    seller_handle,
  } = req.validatedQuery

  const filters: MeilisearchProviderFilters = {
    seller_handle,
    collection_ids: toStringArray(collection_id),
    category_ids: toStringArray(category_id),
    type_ids: toStringArray(type_id),
    tag_ids: toStringArray(tag_id),
    size_values: toStringArray(size),
    color_values: toStringArray(color),
    condition_values: toStringArray(condition),
    promotion_types: toStringArray(promotion_type),
    price_min: min_price,
    price_max: max_price,
  }

  const items = await searchCatalogFacetValues(facet, filters, search)

  res.json({ facet, items })
}
