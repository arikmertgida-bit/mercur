import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  QueryContext
} from '@medusajs/framework/utils'
import type { SearchParamsObject } from 'algoliasearch'
import { z } from 'zod'

import { ALGOLIA_MODULE } from '../../../../modules/algolia'
import { IAlgoliaModuleService, IndexType } from '../../../../modules/algolia/types'
import { StoreSearchProductsType } from './validators'

const AlgoliaHitSchema = z.object({
  id: z.string()
})

type AlgoliaHit = z.infer<typeof AlgoliaHitSchema>

export const POST = async (
  req: MedusaRequest<StoreSearchProductsType>,
  res: MedusaResponse
) => {
  const algoliaService =
    req.scope.resolve<IAlgoliaModuleService>(ALGOLIA_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    query: searchQuery,
    page,
    hitsPerPage,
    filters,
    facets,
    maxValuesPerFacet,
    currency_code,
    region_id,
    customer_id,
    customer_group_id
  } = req.validatedBody

  const searchParams: SearchParamsObject = {
    query: searchQuery,
    page,
    hitsPerPage,
    attributesToRetrieve: ['id'],
    attributesToHighlight: []
  }

  if (filters) {
    searchParams.filters = filters
  }
  if (facets) {
    searchParams.facets = facets
  }
  if (maxValuesPerFacet) {
    searchParams.maxValuesPerFacet = maxValuesPerFacet
  }

  const algoliaResult = await algoliaService.search<AlgoliaHit>(
    IndexType.PRODUCT,
    searchParams
  )

  const productIds = z
    .array(AlgoliaHitSchema)
    .parse(algoliaResult.hits)
    .map((hit) => hit.id)

  if (productIds.length === 0) {
    return res.json({
      products: [],
      nbHits: algoliaResult.nbHits,
      page: algoliaResult.page,
      nbPages: algoliaResult.nbPages,
      hitsPerPage: algoliaResult.hitsPerPage,
      facets: algoliaResult.facets,
      facets_stats: algoliaResult.facets_stats,
      processingTimeMS: algoliaResult.processingTimeMS,
      query: algoliaResult.query
    })
  }

  const hasPricingContext =
    currency_code || region_id || customer_id || customer_group_id

  const pricingContext = hasPricingContext
    ? {
        variants: {
          calculated_price: QueryContext({
            ...(currency_code && { currency_code }),
            ...(region_id && { region_id }),
            ...(customer_id && { customer_id }),
            ...(customer_group_id && { customer_group_id })
          })
        }
      }
    : undefined

  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*',
      'images.*',
      'options.*',
      'options.values.*',
      'variants.*',
      'variants.options.*',
      'variants.prices.*',
      ...(hasPricingContext ? ['variants.calculated_price.*'] : []),
      'categories.*',
      'collection.*',
      'type.*',
      'tags.*',
      'seller.*'
    ],
    filters: {
      id: productIds
    },
    ...(pricingContext && { context: pricingContext })
  })

  const productMap = new Map(products.map((p) => [p.id, p]))
  const orderedProducts = productIds
    .map((id) => productMap.get(id))
    .filter(Boolean)

  res.json({
    products: orderedProducts,
    nbHits: algoliaResult.nbHits,
    page: algoliaResult.page,
    nbPages: algoliaResult.nbPages,
    hitsPerPage: algoliaResult.hitsPerPage,
    facets: algoliaResult.facets,
    facets_stats: algoliaResult.facets_stats,
    processingTimeMS: algoliaResult.processingTimeMS,
    query: algoliaResult.query
  })
}
