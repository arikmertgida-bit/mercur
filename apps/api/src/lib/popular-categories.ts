import type { Query } from '@medusajs/framework'

// Sampling heuristic, not an exact popularity ranking: tallies category
// frequency across a bounded sample of published products. An exact global
// count across the full catalog isn't worth the scan cost for a low-stakes
// navbar suggestion list.
const SAMPLE_SIZE = 500

type ProductCategorySampleRow = {
  categories?: Array<{ id: string; name: string }> | null
}

export type PopularCategory = {
  id: string
  name: string
}

export async function getPopularCategories(
  query: Query,
  limit: number
): Promise<PopularCategory[]> {
  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['categories.id', 'categories.name'],
    filters: { status: 'published' },
    pagination: { skip: 0, take: SAMPLE_SIZE },
  })

  const counts = new Map<string, { name: string; count: number }>()
  for (const product of products as ProductCategorySampleRow[]) {
    for (const category of product.categories ?? []) {
      const existing = counts.get(category.id)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(category.id, { name: category.name, count: 1 })
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id, { name }]) => ({ id, name }))
}
