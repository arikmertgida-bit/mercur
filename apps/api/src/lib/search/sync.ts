import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { removeDocs } from './meilisearch-client'
import { indexProductPage, loadRegions } from './reindex'
import { searchProductFields, SearchProductRow } from './build-docs'

const uniq = (ids: (string | undefined | null)[]): string[] =>
  Array.from(new Set(ids.filter((id): id is string => Boolean(id))))

export const removeProducts = async (
  productIds: string[]
): Promise<void> => {
  const ids = uniq(productIds)
  if (!ids.length) {
    return
  }
  await removeDocs(ids)
}

export const reindexProductsById = async (
  container: MedusaContainer,
  productIds: string[]
): Promise<void> => {
  const ids = uniq(productIds)
  if (!ids.length) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: 'product',
    fields: searchProductFields,
    filters: { id: ids, status: 'published' },
  })

  const publishedIds = new Set(products.map((p: { id: string }) => p.id))
  const staleIds = ids.filter((id) => !publishedIds.has(id))

  if (products.length) {
    const regions = await loadRegions(container)
    await indexProductPage(container, products as SearchProductRow[], regions)
  }

  if (staleIds.length) {
    await removeProducts(staleIds)
  }
}

export const getProductIdsForSeller = async (
  container: MedusaContainer,
  sellerId: string
): Promise<string[]> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: links } = await query.graph({
    entity: 'product_seller',
    fields: ['product_id'],
    filters: { seller_id: sellerId },
  })
  return uniq(links.map((l: { product_id: string | null }) => l.product_id))
}
