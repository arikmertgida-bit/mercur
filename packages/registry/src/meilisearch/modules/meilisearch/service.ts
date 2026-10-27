import { Logger } from '@medusajs/framework/types'
import { Meilisearch, SearchParams } from 'meilisearch'
import { z } from 'zod'

import { IndexType, MeilisearchEntity, MeilisearchSearchResult } from './types'

type InjectedDependencies = {
  logger: Logger
}

// Search responses come from the Meilisearch server; only the fields the
// result is built from are read, and they are validated first.
const SearchHitSchema = z.object({ id: z.string() })

const SearchPaginationSchema = z.object({
  totalHits: z.number().optional(),
  page: z.number().optional(),
  totalPages: z.number().optional(),
  hitsPerPage: z.number().optional(),
  estimatedTotalHits: z.number().optional(),
})

type ModuleOptions = {
  host: string
  apiKey: string
}

const SEARCHABLE_ATTRIBUTES = [
  'title',
  'subtitle',
  'description',
  'tags.value',
  'type.value',
  'categories.name',
  'collection.title',
  'variants.title',
  'seller.name',
  'seller.handle',
]

const FILTERABLE_ATTRIBUTES = [
  'seller.status',
  'seller.handle',
  'categories.id',
  'categories.name',
  'variants.prices.amount',
  'status',
]

const SORTABLE_ATTRIBUTES = ['title', 'variants.prices.amount']

class MeilisearchModuleService {
  private client_: Meilisearch
  private host_: string
  private productIndex_: ReturnType<Meilisearch['index']>
  private settingsApplied_ = false

  constructor(_container: InjectedDependencies, options: ModuleOptions) {
    if (!options?.host || !options?.apiKey) {
      const missing = [
        !options?.host && 'MEILISEARCH_HOST',
        !options?.apiKey && 'MEILISEARCH_API_KEY',
      ]
        .filter(Boolean)
        .join(', ')
      throw new Error(
        `[meilisearch block] Missing required environment variables: ${missing}`
      )
    }
    this.host_ = options.host
    this.client_ = new Meilisearch({
      host: options.host,
      apiKey: options.apiKey,
    })
    this.productIndex_ = this.client_.index(IndexType.PRODUCT)
  }

  getHost(): string {
    return this.host_
  }

  async getStatus(): Promise<{ documentCount: number; isHealthy: boolean }> {
    try {
      const stats = await this.productIndex_.getStats()
      return { documentCount: stats.numberOfDocuments, isHealthy: true }
    } catch {
      return { documentCount: 0, isHealthy: false }
    }
  }

  async batchUpsert(documents: MeilisearchEntity[]): Promise<void> {
    if (!documents.length) {
      return
    }
    await this.productIndex_.addDocuments(documents, { primaryKey: 'id' })
  }

  async batchDelete(ids: string[]): Promise<void> {
    if (!ids.length) {
      return
    }
    await this.productIndex_.deleteDocuments(ids)
  }

  async search(
    query: string,
    options: SearchParams
  ): Promise<MeilisearchSearchResult> {
    const result = await this.productIndex_.search(query, options)

    const pagination = SearchPaginationSchema.parse(result)

    return {
      hits: z.array(SearchHitSchema).parse(result.hits ?? []),
      totalHits: pagination.totalHits ?? pagination.estimatedTotalHits ?? 0,
      page: pagination.page ?? 0,
      totalPages: pagination.totalPages ?? 0,
      hitsPerPage: pagination.hitsPerPage ?? 0,
      processingTimeMs: result.processingTimeMs,
      query: result.query,
      facetDistribution: result.facetDistribution,
    }
  }

  async ensureSettings(): Promise<void> {
    if (this.settingsApplied_) {
      return
    }
    await this.productIndex_.updateSettings({
      searchableAttributes: SEARCHABLE_ATTRIBUTES,
      filterableAttributes: FILTERABLE_ATTRIBUTES,
      sortableAttributes: SORTABLE_ATTRIBUTES,
    })
    this.settingsApplied_ = true
  }
}

export default MeilisearchModuleService
