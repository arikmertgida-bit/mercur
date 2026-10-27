import { z } from 'zod'

import { MedusaContainer } from '@medusajs/framework'
import { IEventBusModuleService } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules, arrayDifference } from '@medusajs/framework/utils'
import { parseGraphRow, parseGraphRows } from '@mercurjs/core/utils/graph-rows'

import {
  MeilisearchProductValidator,
  MeilisearchVariantValidator,
} from '../../modules/meilisearch/types'
import { MeilisearchEvents } from '../../modules/meilisearch/types'

const CHUNK_SIZE = 100

const ProductOptionRowSchema = z.object({
  title: z.string().nullish(),
  values: z.array(z.object({ value: z.string() })).nullish(),
})

const ProductSellerRowSchema = z.object({
  id: z.string(),
  handle: z.string().nullish(),
  name: z.string().nullish(),
  status: z.string().nullish(),
})

const MeilisearchProductRowSchema = z.object({
  options: z.array(ProductOptionRowSchema).nullish(),
  variants: z.array(MeilisearchVariantValidator).nullish(),
  // `sellers` is a many-to-many link: an array, or a single object.
  sellers: z
    .union([z.array(ProductSellerRowSchema), ProductSellerRowSchema])
    .nullish(),
})

const SellerProductsRowSchema = z.object({
  products: z.array(z.object({ id: z.string() })).nullish(),
})

type ProductOptionRow = z.infer<typeof ProductOptionRowSchema>
type MeilisearchVariant = z.infer<typeof MeilisearchVariantValidator>

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'status'],
    filters: { id: ids },
  })

  const published = products.filter((p) => p.status === 'published')
  const notPublished = arrayDifference(products, published)

  const existingIds = new Set(products.map((p) => p.id))
  const deletedIds = ids.filter((id) => !existingIds.has(id))

  return {
    published: published.map((p) => p.id),
    other: [...notPublished.map((p) => p.id), ...deletedIds],
  }
}

function flattenProductOptions(options: ProductOptionRow[]): Record<string, string>[] {
  return options.flatMap((option) => {
    const title = option.title
    if (!title || !option.values) {
      return []
    }
    return option.values.map((value) => ({
      [title.toLowerCase()]: value.value,
    }))
  })
}

function flattenVariantOptions(variant: MeilisearchVariant): MeilisearchVariant {
  const entry: MeilisearchVariant = { ...variant }
  for (const item of variant.options) {
    if (item.option.title) {
      entry[item.option.title.toLowerCase()] = item.value
    }
  }
  return entry
}

export async function findAndTransformMeilisearchProducts(
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
      'variants.prices.*',
      'options.*',
      'options.values.*',
      'images.*',
      'sellers.id',
      'sellers.handle',
      'sellers.name',
      'sellers.status',
    ],
    filters: ids.length
      ? { id: ids, status: 'published' }
      : { status: 'published' },
  })

  const transformed = products.map((row) => {
    const { options, variants, sellers } = parseGraphRow(
      MeilisearchProductRowSchema,
      row
    )
    const { sellers: _sellers, ...rest } = row
    return {
      ...rest,
      options: flattenProductOptions(options ?? []),
      variants: (variants ?? []).map(flattenVariantOptions),
      seller: Array.isArray(sellers) ? (sellers[0] ?? null) : (sellers ?? null),
    }
  })

  return z.array(MeilisearchProductValidator).parse(transformed)
}

export async function reindexSellerProducts(
  container: MedusaContainer,
  sellerId: string,
  action: string
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  try {
    const { data: sellers } = await query.graph({
      entity: 'seller',
      fields: ['products.id'],
      filters: { id: sellerId },
    })

    const [seller] = parseGraphRows(SellerProductsRowSchema, sellers)
    const productIds: string[] =
      seller?.products?.map((p) => p.id) ?? []

    if (!productIds.length) {
      return
    }

    logger.debug(
      `Meilisearch: Seller ${sellerId} ${action} — re-indexing ${productIds.length} products`
    )

    const chunks = chunkArray(productIds, CHUNK_SIZE)
    await Promise.all(
      chunks.map((chunk) =>
        eventBus.emit({
          name: MeilisearchEvents.PRODUCTS_CHANGED,
          data: { ids: chunk },
        })
      )
    )
  } catch (error) {
    logger.error(
      `Meilisearch: Failed to process seller.${action} for seller ${sellerId}:`,
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}
