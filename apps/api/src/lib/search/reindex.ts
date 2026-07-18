import type { Query } from '@medusajs/framework'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { indexDocs } from './meilisearch-client'
import { buildProductDocs, SearchProductRow, SearchRegion } from './build-docs'

export const loadRegions = async (
  container: MedusaContainer
): Promise<SearchRegion[]> => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: 'region',
    fields: ['id', 'currency_code', 'automatic_taxes', 'countries.iso_2'],
  })
  return data as SearchRegion[]
}

// Same store -> default_sales_channel_id lookup already used to scope
// seller stock locations (see createSellerStockLocationsWorkflow) — reused
// here to decide which locations' stock counts toward `in_stock`.
export const loadDefaultSalesChannelId = async (
  container: MedusaContainer
): Promise<string | null> => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: 'store',
    fields: ['id', 'default_sales_channel_id'],
  })
  return data[0]?.default_sales_channel_id ?? null
}

export const indexProductPage = async (
  container: MedusaContainer,
  products: SearchProductRow[],
  regions: SearchRegion[],
  defaultSalesChannelId: string | null
): Promise<void> => {
  const { docs: productDocs } = await buildProductDocs(
    container,
    products,
    regions,
    defaultSalesChannelId
  )

  if (!productDocs.length) {
    return
  }

  await indexDocs(productDocs)
}
