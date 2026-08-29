export interface SearchDoc {
  id: string
  type: 'product'
  title: string
  description?: string
  handle?: string
  thumbnail?: string
  created_at?: string
  seller_id?: string
  seller_handle?: string
  seller_status?: string
  // Epoch-ms closure-window bounds — see `NEVER_CLOSED_TS` in build-docs.ts
  // for why a null closed_from/closed_to is encoded as a sentinel rather
  // than left `undefined`. Always evaluated against the query-time clock in
  // meilisearch-client.ts, never at index time.
  seller_closed_from_ts?: number
  seller_closed_to_ts?: number
  // Operator-only "featured store" flag (admin: Featured Store). Drives the
  // `seller_is_premium` custom Meilisearch ranking rule — see
  // meilisearch-client.ts. Never used as a filter, only a soft ranking boost.
  seller_is_premium?: boolean
  collection_id?: string
  collection?: string
  category_ids?: string[]
  categories?: string[]
  type_id?: string
  type_title?: string
  tag_ids?: string[]
  product_id?: string
  variant_id?: string
  sku?: string
  // Composite tokens `attr:<attribute_handle>:<value_id>`; only is_filterable
  // attribute values are tokenized.
  attribute_tokens?: string[]
  attributes?: SearchDocAttribute[]
  // Price snapshot per region, computed at index time.
  prices?: Record<string, SearchDocPrice>
  calculated_price?: SearchDocPrice | null
  // Whether at least one variant is currently purchasable — computed at
  // index time from live inventory, always filtered on server-side.
  in_stock: boolean
  // Vendor promotion kinds (see promotion-index.ts) currently covering this
  // product, and the campaign(s) they belong to. Empty when the product has
  // no active, product-targeting promotion.
  promotion_types?: string[]
  campaign_ids?: string[]
}

export interface SearchDocAttribute {
  id: string
  handle: string
  name: string
  type: string
  values: Array<{ id: string; name: string }>
}

export interface SearchDocPrice {
  calculated_amount: number
  original_amount: number
  currency_code: string
}

export interface SearchQueryBase {
  q?: string
  limit?: number
  offset?: number
  context?: Record<string, unknown>
  filters?: Record<string, unknown>
}

export interface SearchFacetValue {
  id: string
  label: string
  count: number
}

export interface SearchFacetAttribute {
  handle: string
  label: string
  values: SearchFacetValue[]
}

export interface SearchFacets {
  collections: SearchFacetValue[]
  categories: SearchFacetValue[]
  attributes: SearchFacetAttribute[]
  // Optional: populated only for the well-known storefront filter axes
  // (size/color/condition/type) — see meilisearch-client.ts.
  sizes?: SearchFacetValue[]
  colors?: SearchFacetValue[]
  conditions?: SearchFacetValue[]
  types?: SearchFacetValue[]
  // Product-targeting promotion kinds currently covering the result set —
  // see promotion-index.ts for the resolvable kinds.
  promotions?: SearchFacetValue[]
}

export interface SearchResults {
  hits: SearchDoc[]
  count: number
  facets?: SearchFacets
}
