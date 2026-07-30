import { HttpTypes } from "@medusajs/types"
import { AttributeType, ProductAttributeBatchAdd } from "@mercurjs/types"
import { ProductCreateSchemaType } from "./types"

export type NormalizedCreateProductVariant =
  HttpTypes.AdminCreateProductVariant & {
    // Mercur extension: initial stock levels to seed on the variant's
    // auto-created inventory item, keyed by stock location.
    inventory?: { location_id: string; quantity: number }[]
  }

export type NormalizedCreateProduct = Omit<
  HttpTypes.AdminCreateProduct,
  "variants"
> & {
  // Mercur's `attributes[]` batch-add extension on top of the stock Medusa
  // create-product payload — not part of `AdminCreateProduct` itself.
  attributes?: ProductAttributeBatchAdd[]
  shipping_profile_id?: string
  variants: NormalizedCreateProductVariant[]
}

/**
 * True when at least one variant-axis attribute is set up — the same
 * condition `product-create-variants-form.tsx` uses to decide whether the
 * per-variant Image column is shown at all. Shared here so the required-
 * media validation in `ProductCreateSchema` never drifts out of sync with
 * what the seller can actually see in the grid.
 */
export const hasVariantMediaColumn = (
  attributes: ProductCreateSchemaType["attributes"] | undefined
): boolean => (attributes ?? []).some((attr) => attr.use_for_variants && attr.title)

export const normalizeProductFormValues = (
  values: ProductCreateSchemaType & {
    status: HttpTypes.AdminProductStatus
  },
  currencies: string[]
): NormalizedCreateProduct => {
  // If the seller never explicitly marks a photo as the thumbnail, the first
  // uploaded one becomes it — otherwise `thumbnail` stays empty and the
  // storefront gallery has no lead image to render at all.
  const thumbnailMedia =
    values.media?.find((media) => media.isThumbnail) ?? values.media?.[0]
  const thumbnail = thumbnailMedia?.url
  const images = values.media
    ?.filter((media) => media !== thumbnailMedia)
    .map((media) => ({ url: media.url }))

  const hasAxis = (values.attributes ?? []).some(
    (a) => a.use_for_variants && toValueArray(a.values).length > 0
  )

  const attributes = normalizeFormAttributes(values.attributes ?? [])

  if (!hasAxis) {
    attributes.push({
      title: "Default Option",
      type: AttributeType.MULTI_SELECT,
      values: ["Default"],
      is_variant_axis: true,
    })
  }

  return {
    is_giftcard: false,
    status: values.status,
    tags: values?.tags?.length
      ? values.tags?.map((tag) => ({ id: tag }))
      : undefined,
    images,
    collection_id: values.collection_id || undefined,
    categories: values.category_id ? [{ id: values.category_id }] : undefined,
    type_id: values.type_id || undefined,
    shipping_profile_id: values.shipping_profile_id || undefined,
    handle: values.handle?.trim(),
    origin_country: values.origin_country || undefined,
    material: values.material || undefined,
    mid_code: values.mid_code || undefined,
    hs_code: values.hs_code || undefined,
    thumbnail,
    title: values.title.trim(),
    subtitle: values.subtitle?.trim(),
    description: values.description?.trim(),
    discountable: values.discountable,
    width: values.width ? parseFloat(values.width) : undefined,
    length: values.length ? parseFloat(values.length) : undefined,
    height: values.height ? parseFloat(values.height) : undefined,
    weight: values.weight ? parseFloat(values.weight) : undefined,
    attributes: attributes.length ? attributes : undefined,
    variants: normalizeVariants(
      values.variants.filter((variant) => variant.should_create),
      hasAxis,
      currencies,
    ),
  }
}

const numericOrZero = (value: number | "" | undefined | null): number => {
  if (value === "" || value === null || value === undefined) return 0
  return Number(value) || 0
}

export const normalizeVariants = (
  variants: ProductCreateSchemaType["variants"],
  hasAxis: boolean,
  currencies: string[],
): NormalizedCreateProductVariant[] => {
  return variants.map((variant) => {
    const opts = variant.options
    const hasOpts = opts && Object.keys(opts).length > 0

    // Only send a price for currencies the seller actually typed a value
    // for — sending 0 for every marketplace currency would silently create
    // free-priced entries for currencies the seller left blank.
    const prices = currencies
      .filter(
        (currency) =>
          variant.prices?.[currency] !== undefined &&
          variant.prices[currency] !== ""
      )
      .map((currency) => ({
        currency_code: currency,
        amount: numericOrZero(variant.prices?.[currency]),
      }))

    const inventory = Object.entries(variant.inventory ?? {})
      .filter(([, level]) => level?.checked)
      .map(([locationId, level]) => ({
        location_id: locationId,
        quantity: numericOrZero(level.quantity),
      }))

    return {
      title: variant.title || (hasOpts ? Object.values(opts).join(" / ") : "Default variant"),
      options: hasOpts ? opts : hasAxis ? undefined : { "Default Option": "Default" },
      sku: variant.sku || undefined,
      variant_rank: variant.variant_rank,
      // `manage_inventory` isn't part of the create-product variant schema —
      // `createProductsWorkflow` (packages/core) derives it itself from the
      // presence of `inventory` entries. Sending it trips the endpoint's
      // `.strict()` Zod schema ("unrecognized field").
      prices,
      inventory,
    }
  })
}

const toValueArray = (values: string | string[] | undefined): string[] =>
  Array.isArray(values) ? values.filter(Boolean) : values ? [values] : []

/**
 * SPEC-014: collapse the form's attribute rows into the unified
 * `attributes[]` create input (`ProductAttributeBatchAdd`). Axis vs. non-axis
 * is derived from `use_for_variants`; existing refs go in by `id`, custom rows
 * by `title` (inline product-scoped). Select types pass `value_ids` (resolved
 * by name), text/unit/toggle pass a single `value` scalar.
 */
const normalizeFormAttributes = (
  attributes: NonNullable<ProductCreateSchemaType["attributes"]>
): ProductAttributeBatchAdd[] => {
  const result: ProductAttributeBatchAdd[] = []

  for (const attr of attributes) {
    const vals = toValueArray(attr.values)
    const type = attr.type as string | undefined
    const isSelect = type === "single_select" || type === "multi_select"

    if (attr.attribute_id) {
      // Existing catalog attribute referenced by id.
      if (isSelect || attr.use_for_variants) {
        // Select / axis: resolve chosen value names to ids.
        const nameToId = new Map(
          (attr.available_values ?? []).map((v) => [v.name, v.id])
        )
        const valueIds = vals
          .map((name) => nameToId.get(name))
          .filter(Boolean) as string[]

        // A variant axis without chosen values is meaningless (stock Medusa
        // would synthesise a valueless option and reject the default variant),
        // so skip the ref entirely and let the product fall through.
        if (!valueIds.length) continue

        result.push({ id: attr.attribute_id, value_ids: valueIds })
      } else {
        // Text / unit / toggle: a single free-form scalar.
        if (!vals.length || !vals[0]) continue
        result.push({
          id: attr.attribute_id,
          value: type === "toggle" ? vals[0] === "true" : vals[0],
        })
      }
    } else if (attr.is_custom && attr.title) {
      // Inline (product-scoped) attribute created from a custom row.
      if (!vals.length) continue

      if (attr.use_for_variants) {
        result.push({
          title: attr.title,
          type: (type as AttributeType) ?? AttributeType.MULTI_SELECT,
          values: vals,
          is_variant_axis: true,
        })
      } else if (isSelect) {
        result.push({
          title: attr.title,
          type: type as AttributeType,
          values: vals,
        })
      } else {
        result.push({
          title: attr.title,
          type: (type as AttributeType) ?? AttributeType.TEXT,
          value: type === "toggle" ? vals[0] === "true" : vals[0],
        })
      }
    }
  }

  return result
}

// --- Variant title / SKU auto-generation ---

type SellerSkuSource = {
  id: string
  handle?: string | null
}

const TURKISH_ASCII_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
}

const SKU_FALLBACK_SEGMENT = "MAGAZA"
const SKU_MAX_SELLER_CODE_LENGTH = 10
const SKU_SEGMENT_SEPARATOR = "-"

const DIACRITIC_COMBINING_MARKS_PATTERN = /[̀-ͯ]/g

const toSkuSafeAsciiUpperCase = (value: string): string => {
  const asciiTurkish = value
    .split("")
    .map((char) => TURKISH_ASCII_MAP[char] ?? char)
    .join("")

  return asciiTurkish
    .normalize("NFD")
    .replace(DIACRITIC_COMBINING_MARKS_PATTERN, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
}

export const getSellerSkuCode = (seller: SellerSkuSource): string => {
  const source = seller.handle || seller.id
  const ascii = toSkuSafeAsciiUpperCase(source).replace(/\s+/g, "")

  return ascii.slice(0, SKU_MAX_SELLER_CODE_LENGTH) || SKU_FALLBACK_SEGMENT
}

const generateSkuUniqueSuffix = (): string => {
  const timePart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()

  return `${timePart}${randomPart}`
}

/**
 * Store-only SKU (never derived from the product title): a seller code plus
 * a time+random suffix. The suffix makes collisions astronomically unlikely
 * across a marketplace-wide catalog without a server round-trip; the
 * backend's own unique constraint on `product_variant.sku` remains the
 * final guarantee. Generated once per variant and never re-derived, since
 * the field is read-only for sellers.
 */
export const generateVariantSku = (seller: SellerSkuSource): string => {
  const sellerCode = getSellerSkuCode(seller)
  const uniqueSuffix = generateSkuUniqueSuffix()

  return [sellerCode, uniqueSuffix].join(SKU_SEGMENT_SEPARATOR)
}

export const decorateVariantsWithDefaultValues = (
  variants: ProductCreateSchemaType["variants"]
) => {
  return variants.map((variant) => ({
    ...variant,
    title: variant.title || "",
    sku: variant.sku || "",
    prices: variant.prices ?? {},
    inventory: variant.inventory ?? {},
    media: variant.media ?? [],
  }))
}

// --- Variant generation from attributes ---

const getPermutations = (
  data: { title: string; values: string[] }[]
): Record<string, string>[] => {
  if (data.length === 0) return []
  if (data.length === 1) {
    return data[0].values.map((value) => ({ [data[0].title]: value }))
  }

  const [first, ...rest] = data
  return first.values.flatMap((value) =>
    getPermutations(rest).map((perm) => ({ [first.title]: value, ...perm }))
  )
}

export const generateVariantsFromAttributes = (
  attributes: NonNullable<ProductCreateSchemaType["attributes"]>,
  currentVariants: ProductCreateSchemaType["variants"]
): ProductCreateSchemaType["variants"] => {
  const variantAxes = attributes
    .filter((attr) => attr.use_for_variants)
    .map((attr) => ({
      title: attr.title,
      values: Array.isArray(attr.values)
        ? attr.values
        : attr.values
          ? [attr.values]
          : [],
    }))
    .filter((axis) => axis.title && axis.values.length > 0)

  if (variantAxes.length === 0) {
    // No variant axes — ensure a default variant exists
    const hasDefault = currentVariants.some((v) => v.is_default)
    if (hasDefault && currentVariants.length > 0) {
      return currentVariants
    }
    return decorateVariantsWithDefaultValues([
      {
        title: "Default variant",
        should_create: true,
        variant_rank: 0,
        options: {},
        is_default: true,
        prices: {},
        inventory: {},
        media: [],
      },
    ])
  }

  const permutations = getPermutations(variantAxes)

  // Preserve existing variants that still match a permutation
  const newVariants = currentVariants.reduce((acc, variant) => {
    const opts = variant.options
    if (!opts || Object.keys(opts).length === 0) return acc

    const match = permutations.find((perm) =>
      Object.keys(opts).every((key) => opts[key] === perm[key])
    )
    if (match) {
      acc.push({
        ...variant,
        title: Object.values(match).join(" / "),
        options: match,
        is_default: false,
      })
    }
    return acc
  }, [] as typeof currentVariants)

  // Add new permutations not yet in the list
  const usedSet = new Set(
    newVariants.map((v) => JSON.stringify(v.options))
  )
  for (const perm of permutations) {
    if (!usedSet.has(JSON.stringify(perm))) {
      newVariants.push({
        title: Object.values(perm).join(" / "),
        options: perm,
        should_create: true,
        variant_rank: newVariants.length,
        prices: {},
        inventory: {},
        media: [],
      })
    }
  }

  return newVariants
}

// --- Variant → image linking (post-create follow-up) ---

export type VariantMediaUpdate = {
  variantId: string
  variantTitle: string
  thumbnail?: string
  imageIds: string[]
}

/**
 * Resolves each variant's locally-picked `media` (client ids, from the
 * still-unsaved form) into the real `variant_id` / real product `image_id`s
 * the backend now has, after the product create call has returned. Every
 * lookup is defensive — a variant whose SKU, media, or uploaded URL can't be
 * matched is simply skipped, never thrown.
 */
export const buildVariantMediaUpdates = (
  variants: ProductCreateSchemaType["variants"],
  clientMediaIdToUrl: Map<string, string>,
  urlToImageId: Map<string, string>,
  skuToVariantId: Map<string, string>
): VariantMediaUpdate[] => {
  const updates: VariantMediaUpdate[] = []

  for (const variant of variants) {
    if (!variant.should_create || !variant.media?.length || !variant.sku) {
      continue
    }

    const variantId = skuToVariantId.get(variant.sku)
    if (!variantId) {
      continue
    }

    let explicitThumbnail: string | undefined
    let firstResolvedUrl: string | undefined
    const imageIds: string[] = []

    for (const media of variant.media) {
      if (!media.id) {
        continue
      }

      const uploadedUrl = clientMediaIdToUrl.get(media.id)
      if (!uploadedUrl) {
        continue
      }

      // A selected image being the product's own designated thumbnail
      // doesn't make it any less one of this variant's images — it must
      // still be linked via `images.add`. Previously this `continue`d
      // instead, so a variant whose picked photo happened to be the
      // product thumbnail silently lost its only image (the resulting
      // `imageIds` stayed empty and `images` was never sent at all).
      const imageId = urlToImageId.get(uploadedUrl)
      if (imageId) {
        imageIds.push(imageId)
      }

      firstResolvedUrl ??= uploadedUrl

      if (media.isThumbnail) {
        explicitThumbnail = uploadedUrl
      }
    }

    // `media.isThumbnail` only means "this photo is the whole PRODUCT's main
    // thumbnail" — it may not even be among this variant's own selection.
    // The storefront's color swatch reads `variant.thumbnail` directly, so
    // every variant with at least one selected photo needs its own real
    // thumbnail, independent of which photo the seller picked as the
    // product's main one. Fall back to the first resolved photo from this
    // variant's own selection.
    const thumbnail = explicitThumbnail ?? firstResolvedUrl

    if (!thumbnail && imageIds.length === 0) {
      continue
    }

    updates.push({ variantId, variantTitle: variant.title, thumbnail, imageIds })
  }

  return updates
}
