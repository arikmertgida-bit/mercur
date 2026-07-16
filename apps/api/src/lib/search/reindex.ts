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

export const indexProductPage = async (
  container: MedusaContainer,
  products: SearchProductRow[],
  regions: SearchRegion[]
): Promise<void> => {
  const { docs: productDocs } = await buildProductDocs(
    container,
    products,
    regions
  )

  if (!productDocs.length) {
    return
  }

  await indexDocs(productDocs)
}
