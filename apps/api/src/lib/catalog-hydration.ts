import type { Query } from '@medusajs/framework'
import { QueryContext } from '@medusajs/framework/utils'
import { z } from 'zod'

import { parseRows } from './graph-schemas'

type PricingContext = ReturnType<typeof QueryContext>

const CatalogProductPriceSchema = z.object({
  id: z.string(),
  currency_code: z.string(),
  amount: z.number(),
})

const CatalogProductVariantSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  sku: z.string().nullable(),
  prices: z.array(CatalogProductPriceSchema).nullable().default([]),
  options: z
    .array(
      z.object({
        id: z.string(),
        value: z.string(),
        option: z.object({ id: z.string(), title: z.string() }).nullable(),
      })
    )
    .nullable()
    .default([]),
  calculated_price: z
    .object({
      calculated_amount: z.number(),
      original_amount: z.number(),
      currency_code: z.string(),
    })
    .nullable()
    .optional(),
})

const CatalogProductSellerSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string(),
  status: z.string(),
})

// Only the fields the response genuinely depends on are validated by shape;
// this is enough to safely drop a row for a product that was hard-deleted or
// unpublished between Meilisearch indexing and this hydration query, while
// still passing through the richer, non-critical parts of the row.
const CatalogProductRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  handle: z.string().nullable(),
  status: z.string(),
  thumbnail: z.string().nullable(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  images: z
    .array(z.object({ id: z.string(), url: z.string(), rank: z.number() }))
    .nullable()
    .default([]),
  options: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        values: z.array(z.object({ id: z.string(), value: z.string() })).nullable().default([]),
      })
    )
    .nullable()
    .default([]),
  variants: z.array(CatalogProductVariantSchema).nullable().default([]),
  categories: z
    .array(z.object({ id: z.string(), name: z.string(), handle: z.string() }))
    .nullable()
    .default([]),
  tags: z.array(z.object({ id: z.string(), value: z.string() })).nullable().default([]),
  collection: z
    .object({ id: z.string(), title: z.string(), handle: z.string() })
    .nullable()
    .optional(),
  sellers: z.array(CatalogProductSellerSchema).nullable().default([]),
})

type CatalogProductRow = z.infer<typeof CatalogProductRowSchema>

export type HydratedCatalogProduct = Omit<CatalogProductRow, 'sellers'> & {
  seller: z.infer<typeof CatalogProductSellerSchema> | null
}

const BASE_PRODUCT_FIELDS = [
  '*',
  'images.*',
  'options.*',
  'options.values.*',
  'variants.*',
  'variants.options.*',
  'variants.options.option.*',
  'variants.prices.*',
  'categories.*',
  'collection.*',
  'tags.*',
  'sellers.*',
]

// Hydrates Meilisearch hit ids back into full product rows via the DB, in the
// order Meilisearch returned them (relevance/sort order), dropping any id
// that no longer resolves. When `pricingContext` is passed, calculated
// (region/currency-correct) prices are requested too.
export async function hydrateOrderedProducts(
  query: Query,
  orderedIds: string[],
  pricingContext?: PricingContext
): Promise<HydratedCatalogProduct[]> {
  if (!orderedIds.length) {
    return []
  }

  const fields = pricingContext
    ? [...BASE_PRODUCT_FIELDS, 'variants.calculated_price.*']
    : BASE_PRODUCT_FIELDS

  const { data: rows } = await query.graph({
    entity: 'product',
    fields,
    filters: { id: orderedIds },
    ...(pricingContext
      ? { context: { variants: { calculated_price: pricingContext } } }
      : {}),
  })

  const validRows = parseRows(CatalogProductRowSchema, rows as object[])
  const rowsById = new Map(validRows.map((row) => [row.id, row] as const))

  return orderedIds
    .map((id) => rowsById.get(id))
    .filter((row): row is CatalogProductRow => row !== undefined)
    .map((row) => {
      const { sellers, ...rest } = row
      return { ...rest, seller: (sellers ?? [])[0] ?? null }
    })
}
