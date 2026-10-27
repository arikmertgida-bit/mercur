/**
 * The edit drawer is mounted both under `variants/:variant_id` and under the
 * product's `edit-variant?variant_id=` route, so the variant id comes from
 * whichever of the two the matched route provides.
 */
export const resolveEditVariantId = (
  paramVariantId: string | undefined,
  searchVariantId: string | null
): string => {
  const variantId = paramVariantId || searchVariantId

  if (!variantId) {
    throw new Error(`Route parameter "variant_id" is missing`)
  }

  return variantId
}
