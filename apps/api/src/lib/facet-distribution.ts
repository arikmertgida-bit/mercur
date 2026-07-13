import type { SearchFacets } from '@mercurjs/types'

// Maps the generic SearchFacets shape onto the flat, hardcoded keys the
// storefront's sidebar (`useMeiliRefinementList`) already reads.
export function toFacetDistribution(
  facets: SearchFacets | undefined
): Record<string, Record<string, number>> {
  if (!facets) {
    return {}
  }

  const distribution: Record<string, Record<string, number>> = {}

  if (facets.sizes?.length) {
    distribution['variants.size'] = Object.fromEntries(
      facets.sizes.map((facet) => [facet.label, facet.count])
    )
  }
  if (facets.colors?.length) {
    distribution['variants.color'] = Object.fromEntries(
      facets.colors.map((facet) => [facet.label, facet.count])
    )
  }
  if (facets.conditions?.length) {
    distribution['variants.condition'] = Object.fromEntries(
      facets.conditions.map((facet) => [facet.label, facet.count])
    )
  }

  return distribution
}
