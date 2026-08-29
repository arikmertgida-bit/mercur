import { SearchDoc } from './types'

export type MeilisearchSort =
  | 'price_asc'
  | 'price_desc'
  | 'created_at'
  | 'created_at_asc'

// This deployment's own filter contract for `/store/catalog/products`,
// `/store/search/suggest` and `/store/sellers/:handle/products`.
export type MeilisearchProviderFilters = {
  type?: string
  seller_handle?: string
  collection_ids?: string[]
  category_ids?: string[]
  type_ids?: string[]
  tag_ids?: string[]
  attributes?: Record<string, string[]>
  size_values?: string[]
  color_values?: string[]
  condition_values?: string[]
  promotion_types?: string[]
  campaign_id?: string
  has_active_campaign?: boolean
  price_min?: number
  price_max?: number
  sort?: MeilisearchSort
}

// Attribute handle aliases (English + Turkish) this deployment matches
// against for the storefront's three fixed sidebar filter axes. The
// project's attribute system lets admins configure arbitrary handles, so this
// is a best-effort match, not a guarantee — see meilisearch-client.ts.
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
  type_facet?: string
  category_facets: string[]
  attribute_facets: string[]
  size_values: string[]
  color_values: string[]
  condition_values: string[]
}

const FACET_TOKEN_SEP = '|'
const FACET_TOKEN_ESCAPE = '\\'

// Only the separator/escape characters themselves are escaped — unlike a
// blanket `encodeURIComponent`, this keeps a label's real spaces and
// punctuation intact. That matters because these encoded tokens are also
// searched via Meilisearch's own facet-search (`facetQuery`, see
// `searchFacetValues` in meilisearch-client.ts): a percent-encoded label
// (spaces turned into literal "%20") reads as one indivisible token to
// Meilisearch's tokenizer, so a query for one word inside a multi-word
// label would never match. Plain text tokenizes the normal way.
function escapeFacetTokenPart(part: string): string {
  return part
    .replace(new RegExp(`\\${FACET_TOKEN_ESCAPE}`, 'g'), FACET_TOKEN_ESCAPE + FACET_TOKEN_ESCAPE)
    .replace(new RegExp(`\\${FACET_TOKEN_SEP}`, 'g'), FACET_TOKEN_ESCAPE + FACET_TOKEN_SEP)
}

export function encodeFacetToken(...parts: string[]): string {
  return parts.map(escapeFacetTokenPart).join(FACET_TOKEN_SEP)
}

export function decodeFacetToken(token: string): string[] {
  const parts: string[] = []
  let current = ''
  for (let i = 0; i < token.length; i++) {
    const char = token[i]
    if (char === FACET_TOKEN_ESCAPE && i + 1 < token.length) {
      current += token[i + 1]
      i++
    } else if (char === FACET_TOKEN_SEP) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts
}

export function escapeMeiliFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function meiliValueList(values: string[]): string {
  return values.map((value) => `"${escapeMeiliFilterValue(value)}"`).join(', ')
}
