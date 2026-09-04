import type { Query } from '@medusajs/framework'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { removeDocs } from './meilisearch-client'
import { indexProductPage, loadDefaultSalesChannelId, loadRegions } from './reindex'
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

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: 'product',
    fields: searchProductFields,
    filters: { id: ids, status: 'published' },
  })

  const publishedIds = new Set(products.map((p: { id: string }) => p.id))
  const staleIds = ids.filter((id) => !publishedIds.has(id))

  if (products.length) {
    const [regions, defaultSalesChannelId] = await Promise.all([
      loadRegions(container),
      loadDefaultSalesChannelId(container),
    ])
    await indexProductPage(
      container,
      products as SearchProductRow[],
      regions,
      defaultSalesChannelId
    )
  }

  if (staleIds.length) {
    await removeProducts(staleIds)
  }
}

// Shared by the event-driven drain loader and the reconciliation cron —
// `inventory_items` on `product_variant` is a cross-module link, not a plain
// foreign key: it can be *selected* in a nested field path, but filtering a
// `product_variant` query by that nested path 500s ("missing FROM-clause
// entry"), same as `product_seller` elsewhere in this codebase needs its own
// two-hop resolution. Query the link table directly for variant ids, then
// the variants for their product ids.
export const resolveProductIdsFromInventoryItemIds = async (
  container: MedusaContainer,
  inventoryItemIds: string[]
): Promise<string[]> => {
  const ids = uniq(inventoryItemIds)
  if (!ids.length) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: links } = await query.graph({
    entity: 'product_variant_inventory_item',
    fields: ['variant_id'],
    filters: { inventory_item_id: ids },
  })
  const variantIds = uniq(
    links.map((link: { variant_id: string | null }) => link.variant_id)
  )
  if (!variantIds.length) {
    return []
  }

  const { data: variants } = await query.graph({
    entity: 'product_variant',
    fields: ['product_id'],
    filters: { id: variantIds },
  })
  return uniq(variants.map((v: { product_id: string | null }) => v.product_id))
}

export const getProductIdsForSeller = async (
  container: MedusaContainer,
  sellerId: string
): Promise<string[]> => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: links } = await query.graph({
    entity: 'product_seller',
    fields: ['product_id'],
    filters: { seller_id: sellerId },
  })
  return uniq(links.map((l: { product_id: string | null }) => l.product_id))
}
