import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { MercurModules, ProductDTO } from "@mercurjs/types"

type RequestHeaders = { headers: Record<string, string> }

type CreateVendorProductBody = {
  status: string
  title: string
  variants: VendorVariantInput[]
  shipping_profile_id?: string
  attributes?: VendorAttributeInput[]
}

type ApiClient = {
  post: (
    path: string,
    body: CreateVendorProductBody,
    headers: RequestHeaders
  ) => Promise<{ data: { product: ProductDTO } }>
}

/**
 * Master products are not auto-linked to their creating seller. Selling/visibility
 * eligibility lives on the `product_seller` restriction link, so tests that need a
 * product to be "assigned" to a seller (store visibility, category / sales-channel
 * ownership checks) must create that link explicitly.
 */
export const assignProductsToSeller = async (
  container: MedusaContainer,
  sellerId: string,
  productIds: string[]
): Promise<void> => {
  if (!productIds.length) {
    return
  }

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create(
    productIds.map((product_id) => ({
      [Modules.PRODUCT]: { product_id },
      [MercurModules.SELLER]: { seller_id: sellerId },
    }))
  )
}

type VendorVariantInput = {
  title: string
  sku?: string
  /** Maps an axis attribute title to the variant's value, e.g. `{ Size: "M" }`. */
  options?: Record<string, string>
  prices?: { amount: number; currency_code: string }[]
  inventory?: { location_id: string; quantity: number }[]
  variant_rank?: number
}

type VendorAttributeInput =
  | { id: string; value_ids?: string[]; value?: string | number | boolean }
  | {
      title: string
      type?: "single_select" | "multi_select" | "text" | "toggle" | "unit"
      values?: string[]
      value?: string | number | boolean
      is_variant_axis?: boolean
      is_filterable?: boolean
      is_required?: boolean
      description?: string | null
      metadata?: Record<string, string | number | boolean> | null
    }

type CreateVendorProductOptions = {
  title: string
  status?: string
  /** SKU for the single default variant (ignored when `variants` is given). */
  sku?: string
  /** Title for the single default variant. Defaults to `"Default"`. */
  variantTitle?: string
  /** Override the generated variants array entirely. */
  variants?: VendorVariantInput[]
  /**
   * Unified product attributes. Pass a `multi_select` entry with
   * `is_variant_axis: true` to create a variant axis; each variant then
   * references it through its `options` map.
   */
  attributes?: VendorAttributeInput[]
  /** Extra top-level product fields merged into the request body. */
  extra?: { shipping_profile_id?: string }
}

/**
 * Creates a vendor product through `POST /vendor/products` using the current
 * request shape. The vendor flow derives the variant option from the unified
 * `attributes` field (an `is_variant_axis` entry) and otherwise auto-assigns a
 * default option, so a bare variant needs neither `options` nor
 * `variant_attributes`. Returns the created product (with `variants`).
 */
export const createVendorProduct = async (
  api: ApiClient,
  headers: RequestHeaders,
  opts: CreateVendorProductOptions
): Promise<ProductDTO> => {
  const variants = opts.variants ?? [
    { title: opts.variantTitle ?? "Default", sku: opts.sku },
  ]

  const body: CreateVendorProductBody = {
    status: opts.status ?? "published",
    title: opts.title,
    variants,
    ...opts.extra,
  }

  if (opts.attributes) {
    body.attributes = opts.attributes
  }

  const { data } = await api.post(`/vendor/products`, body, headers)

  return data.product
}
