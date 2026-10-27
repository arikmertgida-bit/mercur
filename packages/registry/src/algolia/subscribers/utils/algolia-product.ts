import { z } from 'zod'

import { MedusaContainer } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  arrayDifference,
} from '@medusajs/framework/utils'
import { parseGraphRow, parseGraphRows } from '@mercurjs/core/utils/graph-rows'
import type { JsonRecord } from '@mercurjs/types'

import {
  AlgoliaProductValidator,
  AlgoliaVariantValidator
} from '../../modules/algolia/types'

const VariantInventoryRowSchema = z.object({
  inventory_items: z
    .array(
      z.object({
        inventory: z
          .object({
            location_levels: z
              .array(z.object({ location_id: z.string() }))
              .nullish()
          })
          .nullish()
      })
    )
    .nullish()
})

const StockLocationRowSchema = z.object({
  fulfillment_sets: z
    .array(
      z.object({
        service_zones: z
          .array(
            z.object({
              geo_zones: z
                .array(z.object({ country_code: z.string() }))
                .nullish()
            })
          )
          .nullish()
      })
    )
    .nullish()
})

const ProductSellerRowSchema = z.object({
  seller: z
    .object({
      id: z.string(),
      handle: z.string().nullable(),
      status: z.string().nullable()
    })
    .nullish()
})

const ProductOptionRowSchema = z.object({
  title: z.string().nullish(),
  values: z.array(z.object({ value: z.string() })).nullish()
})

const AlgoliaProductRowSchema = z.object({
  id: z.string(),
  options: z.array(ProductOptionRowSchema).nullish(),
  variants: z.array(AlgoliaVariantValidator).nullish()
})

type ProductOptionRow = z.infer<typeof ProductOptionRowSchema>
type AlgoliaVariant = z.infer<typeof AlgoliaVariantValidator>

function flattenProductOptions(
  options: ProductOptionRow[]
): Record<string, string>[] {
  return options.flatMap((option) => {
    const title = option.title
    if (!title || !option.values) {
      return []
    }
    return option.values.map((value) => ({
      [title.toLowerCase()]: value.value
    }))
  })
}

function flattenVariantOptions(variant: AlgoliaVariant): JsonRecord {
  const entry: JsonRecord = { ...variant }
  for (const item of variant.options) {
    if (item.option.title) {
      entry[item.option.title.toLowerCase()] = item.value
    }
  }
  return entry
}

async function selectProductVariantsSupportedCountries(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: 'product_variant',
    fields: ['inventory_items.inventory.location_levels.location_id'],
    filters: {
      product_id
    }
  })

  let location_ids: string[] = []

  for (const variant of parseGraphRows(VariantInventoryRowSchema, variants)) {
    const inventory_items =
      variant.inventory_items?.map((item) => item.inventory) || []
    const locations = inventory_items
      .flatMap((inventory_item) => inventory_item?.location_levels || [])
      .map((level) => level.location_id)

    location_ids = location_ids.concat(locations)
  }

  const { data: stock_locations } = await query.graph({
    entity: 'stock_location',
    fields: ['fulfillment_sets.service_zones.geo_zones.country_code'],
    filters: {
      id: location_ids
    }
  })

  let country_codes: string[] = []

  for (const location of parseGraphRows(StockLocationRowSchema, stock_locations)) {
    const fulfillmentSets =
      location.fulfillment_sets?.flatMap((set) => set.service_zones || []) || []
    const codes = fulfillmentSets
      .flatMap((sz) => sz.geo_zones || [])
      .map((gz) => gz.country_code)

    country_codes = country_codes.concat(codes)
  }

  return [...new Set(country_codes)]
}

async function selectProductSeller(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product]
  } = await query.graph({
    entity: 'product',
    fields: ['seller.id', 'seller.handle', 'seller.status'],
    filters: {
      id: product_id
    }
  })

  const p = product ? parseGraphRow(ProductSellerRowSchema, product) : undefined
  return p?.seller?.id
    ? {
        id: p.seller.id,
        handle: p.seller.handle,
        status: p.seller.status
      }
    : null
}

export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'status'],
    filters: {
      id: ids
    }
  })

  const published = products.filter((p) => p.status === 'published')
  const notPublished = arrayDifference(products, published)

  const existingIds = new Set(products.map((p) => p.id))

  const deletedIds = ids.filter((id) => !existingIds.has(id))

  return {
    published: published.map((p) => p.id),
    other: [...notPublished.map((p) => p.id), ...deletedIds]
  }
}

export async function findAndTransformAlgoliaProducts(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*',
      'categories.name',
      'categories.id',
      'collection.title',
      'tags.value',
      'type.value',
      'variants.*',
      'variants.options.*',
      'variants.options.prices.*',
      'variants.prices.*',
      'options.*',
      'options.values.*',
      'images.*'
    ],
    filters: ids.length
      ? {
          id: ids,
          status: 'published'
        }
      : { status: 'published' }
  })

  const transformed = []
  for (const row of products) {
    const product = parseGraphRow(AlgoliaProductRowSchema, row)

    transformed.push({
      ...row,
      average_rating: 0,
      supported_countries: await selectProductVariantsSupportedCountries(
        container,
        product.id
      ),
      seller: await selectProductSeller(container, product.id),
      options: flattenProductOptions(product.options ?? []),
      variants: (product.variants ?? []).map(flattenVariantOptions)
    })
  }

  return z.array(AlgoliaProductValidator).parse(transformed)
}
