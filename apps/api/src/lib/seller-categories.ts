import type { Query } from '@medusajs/framework'

export type SellerCategory = {
  id: string
  name: string
  handle: string
}

// Bounded scan (not the whole catalog): a seller's distinct categories are
// derived from at most this many of their published products. Real DB truth
// is required here — Meilisearch facets only give label→count pairs, not
// category handles, so they can't produce this shape (see the composition
// route for the full reasoning).
const MAX_PRODUCTS_SCANNED = 2_000

export async function getSellerCategories(
  query: Query,
  sellerId: string
): Promise<SellerCategory[]> {
  const { data: links } = await query.graph({
    entity: 'product_seller',
    fields: ['product_id'],
    filters: { seller_id: sellerId },
    pagination: { skip: 0, take: MAX_PRODUCTS_SCANNED },
  })

  const productIds = links
    .map((link) => link.product_id)
    .filter((id): id is string => Boolean(id))

  if (!productIds.length) {
    return []
  }

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['categories.id', 'categories.name', 'categories.handle'],
    filters: { id: productIds, status: 'published' },
  })

  const byId = new Map<string, SellerCategory>()
  for (const product of products) {
    for (const category of product.categories ?? []) {
      if (category && !byId.has(category.id)) {
        byId.set(category.id, category)
      }
    }
  }

  return [...byId.values()]
}
