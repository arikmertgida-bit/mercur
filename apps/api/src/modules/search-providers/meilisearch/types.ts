import { SearchDoc } from '@mercurjs/types'

export type MeilisearchProviderOptions = {
  host: string
  apiKey: string
}

export type MeilisearchSort =
  | 'price_asc'
  | 'price_desc'
  | 'created_at'
  | 'created_at_asc'

// This provider's own filter contract. `SearchQueryBase.filters` is typed
// `Record<string, unknown>` upstream — each provider owns its shape.
export type MeilisearchProviderFilters = {
  type?: string
  seller_handle?: string
  collection_ids?: string[]
  category_ids?: string[]
  attributes?: Record<string, string[]>
  size_values?: string[]
  color_values?: string[]
  condition_values?: string[]
  price_min?: number
  price_max?: number
  sort?: MeilisearchSort
}

// Attribute handle aliases (English + Turkish) this deployment matches
// against for the storefront's three fixed sidebar filter axes. The
// project's attribute system lets admins configure arbitrary handles, so this
// is a best-effort match, not a guarantee — see service.ts.
export const SIZE_ATTRIBUTE_HANDLES = new Set(['size', 'beden'])
export const COLOR_ATTRIBUTE_HANDLES = new Set(['color', 'renk'])
export const CONDITION_ATTRIBUTE_HANDLES = new Set(['condition', 'durum'])

// The document actually stored in Meilisearch: the shared SearchDoc plus
// derived, self-describing facet fields so facet labels never require
// separate in-process state (which wouldn't survive a restart or be shared
// across horizontally-scaled API replicas).
export type MeilisearchIndexedDoc = SearchDoc & {
  default_price_amount: number | null
  collection_facet?: string
  category_facets: string[]
  attribute_facets: string[]
  size_values: string[]
  color_values: string[]
  condition_values: string[]
}

const FACET_TOKEN_SEP = '|'

export function encodeFacetToken(...parts: string[]): string {
  return parts.map((part) => encodeURIComponent(part)).join(FACET_TOKEN_SEP)
}

export function decodeFacetToken(token: string): string[] {
  return token.split(FACET_TOKEN_SEP).map((part) => decodeURIComponent(part))
}

export function escapeMeiliFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function meiliValueList(values: string[]): string {
  return values.map((value) => `"${escapeMeiliFilterValue(value)}"`).join(', ')
}
