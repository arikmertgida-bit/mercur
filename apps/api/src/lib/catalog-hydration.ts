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
  // Was missing here even though `sellers.*` already fetched the column —
  // Zod silently strips unlisted keys, so `is_premium` never reached the
  // storefront's catalog/seller-products responses despite being requested.
  is_premium: z.boolean().default(false),
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

// Split in two on purpose — see the comment on `hydrateOrderedProducts`
// below for why these can never be requested in a single `query.graph` call.
const DECORATION_PRODUCT_FIELDS = [
  '*',
  'images.*',
  'options.*',
  'options.values.*',
  'categories.*',
  'collection.*',
  'tags.*',
  'sellers.*',
]

const VARIANT_PRODUCT_FIELDS = [
  'id',
  'variants.*',
  'variants.options.*',
  'variants.options.option.*',
  'variants.prices.*',
]

const ProductVariantsOnlyRowSchema = z.object({
  id: z.string(),
  variants: z.array(CatalogProductVariantSchema).nullable().default([]),
})

// Hydrates Meilisearch hit ids back into full product rows via the DB, in the
// order Meilisearch returned them (relevance/sort order), dropping any id
// that no longer resolves. When `pricingContext` is passed, calculated
// (region/currency-correct) prices are requested too.
//
// Deliberately two parallel `query.graph` calls instead of one combined
// call: requesting `variants.options.option.*` (or `variants.*`) together
// with the product-level one-to-many relations (`images.*`, `categories.*`,
// `collection.*`, `tags.*`, `sellers.*`, `options.*`) in a *single* graph
// query made Medusa's remote-joiner blow up to ~3.3-3.6s for as few as 14
// products/73 variants — confirmed via a real production timing script,
// reproduced with and without `calculated_price` (so it's not a pricing
// cost), and confirmed to disappear (~130-170ms per call, ~170ms total run
// in parallel) the moment the variant-relation fields and the product
// decoration fields are requested in separate calls. This was the root
// cause of the storefront's `/sellers/[handle]` LCP regression after the
// v2.2.0 rebase (this hydration lib is new in that rebase — see
// claude-progress.md Session 43/46).
export async function hydrateOrderedProducts(
  query: Query,
  orderedIds: string[],
  pricingContext?: PricingContext
): Promise<HydratedCatalogProduct[]> {
  if (!orderedIds.length) {
    return []
  }

  const variantFields = pricingContext
    ? [...VARIANT_PRODUCT_FIELDS, 'variants.calculated_price.*']
    : VARIANT_PRODUCT_FIELDS

  const [{ data: decorationRows }, { data: variantRows }] = await Promise.all([
    query.graph({
      entity: 'product',
      fields: DECORATION_PRODUCT_FIELDS,
      filters: { id: orderedIds },
    }),
    query.graph({
      entity: 'product',
      fields: variantFields,
      filters: { id: orderedIds },
      ...(pricingContext
        ? { context: { variants: { calculated_price: pricingContext } } }
        : {}),
    }),
  ])

  const variantsById = new Map(
    parseRows(ProductVariantsOnlyRowSchema, variantRows as object[]).map(
      (row) => [row.id, row.variants] as const
    )
  )

  const mergedRows = (decorationRows as object[]).map((row) => {
    const { id } = row as { id: string }
    return { ...row, variants: variantsById.get(id) ?? [] }
  })

  const validRows = parseRows(CatalogProductRowSchema, mergedRows)
  const rowsById = new Map(validRows.map((row) => [row.id, row] as const))

  return orderedIds
    .map((id) => rowsById.get(id))
    .filter((row): row is CatalogProductRow => row !== undefined)
    .map((row) => {
      const { sellers, ...rest } = row
      return { ...rest, seller: (sellers ?? [])[0] ?? null }
    })
}
