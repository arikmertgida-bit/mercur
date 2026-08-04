import type { Query } from "@medusajs/framework"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ProductStatus } from "@mercurjs/types"

import {
  indexProductPage,
  loadDefaultSalesChannelId,
  loadRegions,
} from "../lib/search/reindex"
import { searchProductFields, SearchProductRow } from "../lib/search/build-docs"

/**
 * One-time full backfill for the Meilisearch product index. Needed whenever
 * a new field is added to `searchProductFields`/`buildProductDocs` (most
 * recently: `seller_closed_from_ts`/`seller_closed_to_ts`) — the incremental
 * subscribers (`search-sync-product-changed`, `search-sync-seller-updated`,
 * ...) only ever re-sync documents whose *source row* changed, so already-
 * indexed products keep their stale doc shape until something re-touches
 * them. Existing filters that read a newly-added field always treat a
 * missing field as "doesn't match" (see `meilisearch-client.ts`), so
 * skipping this backfill after a schema change silently hides every
 * not-yet-reindexed product from every filtered search surface.
 *
 * Run:
 *   bun --cwd apps/api run medusa exec ./src/scripts/reindex-search.ts
 */
const BATCH_SIZE = 500

export default async function reindexSearch({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const [regions, defaultSalesChannelId] = await Promise.all([
    loadRegions(container),
    loadDefaultSalesChannelId(container),
  ])

  let skip = 0
  let total = 0

  while (true) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: searchProductFields,
      filters: { status: ProductStatus.PUBLISHED },
      pagination: { skip, take: BATCH_SIZE },
    })

    if (!products.length) {
      break
    }

    await indexProductPage(
      container,
      products as SearchProductRow[],
      regions,
      defaultSalesChannelId
    )

    total += products.length
    skip += BATCH_SIZE
    logger.info(`[reindex-search] indexed ${String(total)} product(s) so far`)
  }

  logger.info(`[reindex-search] done — ${String(total)} product(s) reindexed`)
}
