import { Params, useParams, useSearchParams } from "react-router-dom"

type VariantRouteParams = {
  productId: string
  variantId: string
}

/**
 * Variant pages mount under `/products/:id/variants/:variant_id/*` and, for
 * the product-level edit drawer, under `/products/:id/edit-variant` with the
 * variant passed as `?variant_id=`. Extension routes may name the product
 * param `product_id` instead.
 */
export const getVariantRouteParams = (
  params: Params,
  searchParams?: URLSearchParams
): VariantRouteParams => {
  const productId = params.id || params.product_id
  const variantId = params.variant_id || searchParams?.get("variant_id")

  if (!productId || !variantId) {
    throw new Error("Route parameters for the product variant are missing")
  }

  return { productId, variantId }
}

/** Hook counterpart of `getVariantRouteParams`. */
export const useVariantRouteParams = (): VariantRouteParams => {
  const params = useParams()
  const [searchParams] = useSearchParams()

  return getVariantRouteParams(params, searchParams)
}
