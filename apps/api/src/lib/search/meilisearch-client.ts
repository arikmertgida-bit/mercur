import type {
  FacetHit,
  Meilisearch as MeilisearchClient,
  SearchForFacetValuesResponse,
} from 'meilisearch' with { 'resolution-mode': 'import' }

import {
  COLOR_ATTRIBUTE_HANDLES,
  CONDITION_ATTRIBUTE_HANDLES,
  decodeFacetToken,
  encodeFacetToken,
  escapeMeiliFilterValue,
  MeilisearchIndexedDoc,
  MeilisearchProviderFilters,
  MeilisearchSort,
  meiliValueList,
  SIZE_ATTRIBUTE_HANDLES,
} from './meilisearch-types'
import {
  SearchDoc,
  SearchFacetAttribute,
  SearchFacetValue,
  SearchFacets,
  SearchQueryBase,
  SearchResults,
} from './types'

const PRODUCT_INDEX = 'products'

const SEARCHABLE_ATTRIBUTES = ['title', 'description', 'handle', 'sku', 'seller_handle']

const FILTERABLE_ATTRIBUTES = [
  'type',
  'in_stock',
  'seller_handle',
  'seller_status',
  'seller_closed_from_ts',
  'seller_closed_to_ts',
  'collection_id',
  'collection_facet',
  'category_ids',
  'category_facets',
  'type_id',
  'tag_ids',
  'attribute_tokens',
  'attribute_facets',
  'default_price_amount',
  'size_values',
  'color_values',
  'condition_values',
  'promotion_types',
  'campaign_ids',
]

const SORTABLE_ATTRIBUTES = ['default_price_amount', 'created_at']

// The four sidebar facet groups that support independent multi-select
// toggling. Each one is computed disjunctively (see `buildFilterParts`
// below) so selecting a value in one group never removes options from
// another group's list — only their live counts change.
const DISJUNCTIVE_FACET_KEYS = [
  'size_values',
  'color_values',
  'condition_values',
  'promotion_types',
] as const

type DisjunctiveFacetKey = (typeof DISJUNCTIVE_FACET_KEYS)[number]

// Meilisearch's own default ranking rules, with one custom rule spliced in:
// operator-flagged "featured stores" (`seller_is_premium`, admin: Featured
// Store) win ties. Placement matters — it sits after `sort` so an explicit
// caller-requested sort (price/date, see `mapSort` below) always wins outright,
// but before `exactness` so premium sellers still surface as a tiebreaker on
// default/browsing listings where no explicit sort or search query narrows
// the result set. This is a ranking nudge only — premium status is never a
// hard filter, non-premium products are always fully discoverable.
const PREMIUM_SELLER_RANKING_RULE = 'seller_is_premium:desc'
const RANKING_RULES = [
  'words',
  'typo',
  'proximity',
  'attribute',
  'sort',
  PREMIUM_SELLER_RANKING_RULE,
  'exactness',
]

// Meilisearch's default pagination.maxTotalHits is 1000 — offset+limit beyond
// that is rejected/truncated, which silently breaks deep pagination on large
// categories. Raised to support the project's stated multi-million product
// scale. Raising this further increases the cost of exhaustive hit counting —
// monitor Meilisearch resource usage before increasing beyond this value.
const MAX_TOTAL_HITS = 1_000_000

function mapSort(sort: MeilisearchSort | undefined): string[] | undefined {
  switch (sort) {
    case 'price_asc':
      return ['default_price_amount:asc']
    case 'price_desc':
      return ['default_price_amount:desc']
    case 'created_at':
      return ['created_at:desc']
    case 'created_at_asc':
      return ['created_at:asc']
    default:
      return undefined
  }
}

class MeilisearchProductIndex {
  private readonly client_: MeilisearchClient
  private readonly productIndex_: ReturnType<MeilisearchClient['index']>
  private settingsApplied_ = false

  private constructor(client: MeilisearchClient) {
    this.client_ = client
    this.productIndex_ = this.client_.index(PRODUCT_INDEX)
  }

  // `meilisearch` ships pure ESM (>=0.5x) while apps/api is a CommonJS
  // package — a static `import` at the top of the file would fail to
  // compile. A dynamic import is the supported way to consume an ESM-only
  // dependency from CJS.
  static async create(host: string, apiKey: string): Promise<MeilisearchProductIndex> {
    const { Meilisearch } = await import('meilisearch')
    return new MeilisearchProductIndex(new Meilisearch({ host, apiKey }))
  }

  private async ensureSettings(): Promise<void> {
    if (this.settingsApplied_) {
      return
    }
    // `updateSettings` only enqueues the change — Meilisearch applies it
    // asynchronously. Awaiting the promise alone resolves as soon as the
    // task is queued, not once it's live, so a search immediately after a
    // settings change (e.g. a newly added filterable attribute, right after
    // a fresh deploy) can 400 against attributes that technically exist but
    // aren't indexed yet. `waitTask()` blocks until Meilisearch actually
    // finishes applying it.
    await this.productIndex_
      .updateSettings({
        searchableAttributes: SEARCHABLE_ATTRIBUTES,
        filterableAttributes: FILTERABLE_ATTRIBUTES,
        sortableAttributes: SORTABLE_ATTRIBUTES,
        rankingRules: RANKING_RULES,
        pagination: { maxTotalHits: MAX_TOTAL_HITS },
      })
      .waitTask()
    this.settingsApplied_ = true
  }

  private enrichDoc(doc: SearchDoc): MeilisearchIndexedDoc {
    const prices = doc.prices ?? {}
    // Single-default-region simplification: this deployment currently runs one
    // active region/currency, so the first indexed price is the default price.
    // A genuinely multi-region marketplace would need per-region sortable
    // fields declared ahead of time — revisit if/when that becomes real.
    const defaultPrice = Object.values(prices)[0]
    const categoryIds = doc.category_ids ?? []
    const categoryLabels = doc.categories ?? []
    const attributes = doc.attributes ?? []

    const valuesForHandles = (handles: Set<string>): string[] =>
      attributes
        .filter((attribute) => handles.has(attribute.handle.toLowerCase()))
        .flatMap((attribute) => attribute.values.map((value) => value.name))

    return {
      ...doc,
      default_price_amount: defaultPrice?.calculated_amount ?? null,
      collection_facet: doc.collection_id
        ? encodeFacetToken(doc.collection_id, doc.collection ?? doc.collection_id)
        : undefined,
      category_facets: categoryIds.map((id, index) =>
        encodeFacetToken(id, categoryLabels[index] ?? id)
      ),
      attribute_facets: attributes.flatMap((attribute) =>
        attribute.values.map((value) =>
          encodeFacetToken(attribute.handle, attribute.name, value.id, value.name)
        )
      ),
      size_values: valuesForHandles(SIZE_ATTRIBUTE_HANDLES),
      color_values: valuesForHandles(COLOR_ATTRIBUTE_HANDLES),
      condition_values: valuesForHandles(CONDITION_ATTRIBUTE_HANDLES),
    }
  }

  async index(docs: SearchDoc[]): Promise<void> {
    if (!docs.length) {
      return
    }
    await this.ensureSettings()
    const enriched = docs.map((doc) => this.enrichDoc(doc))
    await this.productIndex_.addDocuments(enriched, { primaryKey: 'id' })
  }

  async remove(ids: string[]): Promise<void> {
    if (!ids.length) {
      return
    }
    await this.productIndex_.deleteDocuments(ids)
  }

  // seller_status is always constrained to "open" and in_stock to "true"
  // server-side — suspended sellers' products and out-of-stock products
  // must never be discoverable, regardless of what filters the caller
  // sends. The closure-window clause re-derives "now" on every request (see
  // `NEVER_CLOSED_TS` in build-docs.ts) so a seller's scheduled izin
  // starting or ending takes effect immediately, with no reindex — a
  // product stays hidden only while `seller_closed_from_ts` has already
  // passed and `seller_closed_to_ts` hasn't (or never will, for an
  // open-ended closure).
  //
  // `exclude`, when set, omits that one disjunctive facet's own filter
  // clause — this is what makes faceting disjunctive: a facet-value query
  // for "color" is scored against every active filter (size, price,
  // category, ...) EXCEPT its own color selection, so picking "Red" never
  // makes "Blue" disappear from the list, it only updates its live count.
  private buildFilterParts(
    filters: MeilisearchProviderFilters,
    exclude?: DisjunctiveFacetKey
  ): string[] {
    const now = Date.now()
    const filterParts: string[] = [
      'seller_status = "open"',
      'in_stock = true',
      `(seller_closed_from_ts > ${now} OR seller_closed_to_ts < ${now})`,
    ]

    if (filters.type) {
      filterParts.push(`type = "${escapeMeiliFilterValue(filters.type)}"`)
    }
    if (filters.seller_handle) {
      filterParts.push(`seller_handle = "${escapeMeiliFilterValue(filters.seller_handle)}"`)
    }
    if (filters.collection_ids?.length) {
      filterParts.push(`collection_id IN [${meiliValueList(filters.collection_ids)}]`)
    }
    if (filters.category_ids?.length) {
      filterParts.push(`category_ids IN [${meiliValueList(filters.category_ids)}]`)
    }
    if (filters.type_ids?.length) {
      filterParts.push(`type_id IN [${meiliValueList(filters.type_ids)}]`)
    }
    if (filters.tag_ids?.length) {
      filterParts.push(`tag_ids IN [${meiliValueList(filters.tag_ids)}]`)
    }
    if (filters.attributes) {
      const tokens = Object.entries(filters.attributes).flatMap(([handle, valueIds]) =>
        valueIds.map((valueId) => `attr:${handle}:${valueId}`)
      )
      if (tokens.length) {
        filterParts.push(`attribute_tokens IN [${meiliValueList(tokens)}]`)
      }
    }
    if (filters.price_min !== undefined) {
      filterParts.push(`default_price_amount >= ${filters.price_min}`)
    }
    if (filters.price_max !== undefined) {
      filterParts.push(`default_price_amount <= ${filters.price_max}`)
    }
    if (exclude !== 'size_values' && filters.size_values?.length) {
      filterParts.push(`size_values IN [${meiliValueList(filters.size_values)}]`)
    }
    if (exclude !== 'color_values' && filters.color_values?.length) {
      filterParts.push(`color_values IN [${meiliValueList(filters.color_values)}]`)
    }
    if (exclude !== 'condition_values' && filters.condition_values?.length) {
      filterParts.push(`condition_values IN [${meiliValueList(filters.condition_values)}]`)
    }
    if (exclude !== 'promotion_types' && filters.promotion_types?.length) {
      filterParts.push(`promotion_types IN [${meiliValueList(filters.promotion_types)}]`)
    }
    if (filters.campaign_id) {
      filterParts.push(`campaign_ids IN [${meiliValueList([filters.campaign_id])}]`)
    }
    if (filters.has_active_campaign) {
      filterParts.push('campaign_ids IS NOT EMPTY')
    }

    return filterParts
  }

  async search(query: SearchQueryBase): Promise<SearchResults> {
    await this.ensureSettings()

    const filters = (query.filters ?? {}) as MeilisearchProviderFilters
    const context = (query.context ?? {}) as { region_id?: string }
    const q = query.q ?? ''

    const [result, ...disjunctiveFacetResults] = await Promise.all([
      this.productIndex_.search(q, {
        filter: this.buildFilterParts(filters).join(' AND '),
        limit: query.limit ?? 12,
        offset: query.offset ?? 0,
        sort: mapSort(filters.sort),
        facets: ['collection_facet', 'category_facets', 'attribute_facets'],
      }),
      ...DISJUNCTIVE_FACET_KEYS.map((facetName) =>
        this.productIndex_.searchForFacetValues({
          facetName,
          q,
          filter: this.buildFilterParts(filters, facetName).join(' AND '),
        })
      ),
    ])

    const [sizeFacet, colorFacet, conditionFacet, promotionFacet] =
      disjunctiveFacetResults as [
        SearchForFacetValuesResponse,
        SearchForFacetValuesResponse,
        SearchForFacetValuesResponse,
        SearchForFacetValuesResponse,
      ]

    const regionId = context.region_id
    const hits: SearchDoc[] = (result.hits as MeilisearchIndexedDoc[]).map((doc) => {
      const {
        default_price_amount: _defaultPriceAmount,
        collection_facet: _collectionFacet,
        category_facets: _categoryFacets,
        attribute_facets: _attributeFacets,
        size_values: _sizeValues,
        color_values: _colorValues,
        condition_values: _conditionValues,
        ...searchDoc
      } = doc
      const price = regionId ? searchDoc.prices?.[regionId] ?? null : null
      return { ...searchDoc, calculated_price: price }
    })

    const resultWithEstimate = result as { estimatedTotalHits?: number }

    return {
      hits,
      count: resultWithEstimate.estimatedTotalHits ?? hits.length,
      facets: this.buildFacets(result.facetDistribution, {
        sizes: sizeFacet.facetHits,
        colors: colorFacet.facetHits,
        conditions: conditionFacet.facetHits,
        promotions: promotionFacet.facetHits,
      }),
    }
  }

  private buildFacets(
    facetDistribution: Record<string, Record<string, number>> | undefined,
    disjunctiveFacets: {
      sizes: FacetHit[]
      colors: FacetHit[]
      conditions: FacetHit[]
      promotions: FacetHit[]
    }
  ): SearchFacets {
    const collectionDist = facetDistribution?.collection_facet ?? {}
    const categoryDist = facetDistribution?.category_facets ?? {}
    const attributeDist = facetDistribution?.attribute_facets ?? {}

    const toFacetValue = (token: string, count: number): SearchFacetValue => {
      const [id, label] = decodeFacetToken(token)
      return { id: id ?? token, label: label ?? id ?? token, count }
    }

    const toPlainFacetValue = (hit: FacetHit): SearchFacetValue => ({
      id: hit.value,
      label: hit.value,
      count: hit.count,
    })

    const collections = Object.entries(collectionDist).map(([token, count]) =>
      toFacetValue(token, count)
    )
    const categories = Object.entries(categoryDist).map(([token, count]) =>
      toFacetValue(token, count)
    )
    const sizes = disjunctiveFacets.sizes.map(toPlainFacetValue)
    const colors = disjunctiveFacets.colors.map(toPlainFacetValue)
    const conditions = disjunctiveFacets.conditions.map(toPlainFacetValue)
    const promotions = disjunctiveFacets.promotions.map(toPlainFacetValue)

    const byHandle = new Map<string, { label: string; values: SearchFacetValue[] }>()
    for (const [token, count] of Object.entries(attributeDist)) {
      const [handle, attributeName, valueId, valueName] = decodeFacetToken(token)
      if (!handle || !valueId) {
        continue
      }
      const group = byHandle.get(handle) ?? { label: attributeName ?? handle, values: [] }
      group.values.push({ id: valueId, label: valueName ?? valueId, count })
      byHandle.set(handle, group)
    }
    const attributes: SearchFacetAttribute[] = [...byHandle.entries()].map(
      ([handle, group]) => ({ handle, label: group.label, values: group.values })
    )

    return { collections, categories, attributes, sizes, colors, conditions, promotions }
  }

  async campaignIdsForCategory(categoryId: string): Promise<string[]> {
    await this.ensureSettings()
    const result = await this.productIndex_.searchForFacetValues({
      facetName: 'campaign_ids',
      filter: `seller_status = "open" AND in_stock = true AND category_ids IN [${meiliValueList([categoryId])}]`,
    })
    return result.facetHits.map((hit) => hit.value)
  }
}

let singleton: Promise<MeilisearchProductIndex> | null = null

function getProductIndex(): Promise<MeilisearchProductIndex> {
  if (singleton) {
    return singleton
  }
  const host = process.env.MEILISEARCH_HOST
  const apiKey = process.env.MEILISEARCH_MASTER_KEY
  if (!host || !apiKey) {
    throw new Error(
      '[search] Missing required environment variable(s): MEILISEARCH_HOST, MEILISEARCH_MASTER_KEY'
    )
  }
  singleton = MeilisearchProductIndex.create(host, apiKey)
  return singleton
}

export async function indexDocs(docs: SearchDoc[]): Promise<void> {
  return (await getProductIndex()).index(docs)
}

export async function removeDocs(ids: string[]): Promise<void> {
  return (await getProductIndex()).remove(ids)
}

export async function searchProducts(query: SearchQueryBase): Promise<SearchResults> {
  return (await getProductIndex()).search(query)
}

// Distinct campaign IDs among currently discoverable (in_stock, open-seller)
// products in the given category. Used to filter the active-campaigns list
// by category without duplicating category/campaign resolution logic —
// campaign coverage is already fully resolved at product-index time (see
// promotion-index.ts), regardless of which of Medusa's promotion rule types
// (product/category/collection/type/tag) produced it.
export async function getCampaignIdsForCategory(categoryId: string): Promise<string[]> {
  return (await getProductIndex()).campaignIdsForCategory(categoryId)
}
