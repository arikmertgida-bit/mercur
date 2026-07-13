import type { Query } from '@medusajs/framework'

export type ResolvedRegion = {
  id: string
  currency_code: string
}

type RegionRow = {
  id: string
  currency_code: string
  countries?: Array<{ iso_2?: string | null }> | null
}

// Mirrors @mercurjs/core's own `loadRegions` field selection
// (packages/core/src/modules/search/lib/reindex.ts) — regions are few enough
// per marketplace that fetching all of them and matching in-process is safe
// and avoids guessing at nested-relation filter syntax.
export async function resolveRegionByCountryCode(
  query: Query,
  countryCode: string
): Promise<ResolvedRegion | null> {
  const { data: regions } = await query.graph({
    entity: 'region',
    fields: ['id', 'currency_code', 'countries.iso_2'],
  })

  const match = (regions as RegionRow[]).find((region) =>
    (region.countries ?? []).some((country) => country?.iso_2 === countryCode)
  )

  return match ? { id: match.id, currency_code: match.currency_code } : null
}
