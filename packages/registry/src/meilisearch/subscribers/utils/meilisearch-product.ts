import { z } from 'zod'

import { MedusaContainer } from '@medusajs/framework'
import { IEventBusModuleService } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules, arrayDifference } from '@medusajs/framework/utils'
import { JsonRecord } from '@mercurjs/types'

import { MeilisearchProductValidator } from '../../modules/meilisearch/types'
import { MeilisearchEvents } from '../../modules/meilisearch/types'

const CHUNK_SIZE = 100

type ProductOptionGraph = {
  title?: string
  values?: Array<{ value: string }>
}

type VariantOptionGraph = {
  value: string
  option?: { title: string }
}

type MeilisearchVariantGraph = JsonRecord & {
  options?: VariantOptionGraph[]
}

type MeilisearchProductGraph = JsonRecord & {
  id: string
  options?: ProductOptionGraph[]
  variants?: MeilisearchVariantGraph[]
  sellers?: Array<{ id: string }> | { id: string } | null
}

type SellerProductsGraph = {
  products?: Array<{ id: string }>
}

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

function flattenProductOptions(options: ProductOptionGraph[]): Record<string, string>[] {
  return (options ?? [])
    .filter((option) => option?.title && option?.values)
    .flatMap((option) =>
      (option.values ?? []).map((value) => ({
        [option.title!.toLowerCase()]: value.value,
      }))
    )
}

function flattenVariantOptions(variant: MeilisearchVariantGraph): JsonRecord {
  return (variant.options ?? []).reduce<JsonRecord>((entry, item) => {
    if (item?.option?.title) {
      entry[item.option.title.toLowerCase()] = item.value
    }
    return entry
  }, { ...variant })
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

  const transformed = (products as MeilisearchProductGraph[]).map((product) => {
    const { sellers, ...rest } = product
    return {
      ...rest,
      options: flattenProductOptions(product.options ?? []),
      variants: (product.variants ?? []).map(flattenVariantOptions),
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

    const seller = sellers[0] as SellerProductsGraph | undefined
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
