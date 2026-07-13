import type { Query } from '@medusajs/framework'

// Sampling heuristic, not an exact popularity ranking: tallies category
// frequency across a bounded sample of published products. An exact global
// count across the full catalog isn't worth the scan cost for a low-stakes
// navbar suggestion list.
const SAMPLE_SIZE = 500

type ProductCategorySampleRow = {
  categories?: Array<{ name: string }> | null
}

export async function getPopularCategoryNames(
  query: Query,
  limit: number
): Promise<string[]> {
  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['categories.name'],
    filters: { status: 'published' },
    pagination: { skip: 0, take: SAMPLE_SIZE },
  })

  const counts = new Map<string, number>()
  for (const product of products as ProductCategorySampleRow[]) {
    for (const category of product.categories ?? []) {
      counts.set(category.name, (counts.get(category.name) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name)
}
