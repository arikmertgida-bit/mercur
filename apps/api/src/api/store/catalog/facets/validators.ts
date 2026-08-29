import { z } from 'zod'

const csvOrArray = z.union([z.string(), z.array(z.string())])

// Powers the storefront sidebar's Collection/Type search box: a live,
// context-aware facet-value search (see `searchCatalogFacetValues` in
// meilisearch-client.ts) that carries the same contextual filters as
// `/store/catalog/products` so counts stay correct while the user types,
// but never re-runs the full product search + hydration pipeline.
export const StoreGetCatalogFacetsParams = z.object({
  country_code: z.string().min(2).max(2),
  facet: z.enum(['collection', 'type']),
  search: z.string().optional(),
  collection_id: csvOrArray.optional(),
  category_id: csvOrArray.optional(),
  type_id: csvOrArray.optional(),
  tag_id: csvOrArray.optional(),
  size: csvOrArray.optional(),
  color: csvOrArray.optional(),
  condition: csvOrArray.optional(),
  promotion_type: csvOrArray.optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  seller_handle: z.string().optional(),
})

export type StoreGetCatalogFacetsParamsType = z.infer<typeof StoreGetCatalogFacetsParams>
