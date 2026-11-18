import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../utils/graph-rows"
import { getSellerVisibleProductIds } from "../vendor/products/helpers"
import { SELLER_IMAGE_NOT_OWNED_CODE } from "./vendor-error-codes"

/**
 * Files a seller uploads get the seller id baked into the storage key (the
 * file provider builds the key from the filename), the same way customer
 * uploads do (apps/api/src/lib/customer-upload.ts). An image URL a seller
 * sends (product images, store logo, review reply photos) is then accepted
 * only when it is one of its own uploads, or a URL its own data already
 * uses. Anything else would make every visitor's browser fetch a foreign
 * address (tracking pixels) or show another store's files.
 */
const SELLER_UPLOAD_MARKER = "seller-"
const SELLER_UPLOAD_SEPARATOR = "--"

export const sellerUploadFilename = (
  sellerId: string,
  filename: string
): string =>
  `${SELLER_UPLOAD_MARKER}${sellerId}${SELLER_UPLOAD_SEPARATOR}${filename}`

const lastKeySegment = (key: string): string => {
  const parts = key.split("/")
  return parts[parts.length - 1] ?? ""
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Our MinIO provider keys a file as `<name>-<ulid><ext>`; Medusa's local
// provider (used by the test app) as `<timestamp>-<name><ext>`. The marker
// must sit at the start of the name either way, so a seller cannot forge
// another seller's marker through the filename.
export const isSellerUploadKey = (key: string, sellerId: string): boolean =>
  new RegExp(
    `^(?:\\d+-)?${escapeRegExp(sellerUploadFilename(sellerId, ""))}`
  ).test(lastKeySegment(key))

const publicFileBaseUrl = (): string => {
  const base = process.env.MINIO_FILE_URL
  if (!base) {
    throw new Error("MINIO_FILE_URL environment variable is not set")
  }
  return base.replace(/\/+$/, "")
}

/** True when `url` points at a file this seller uploaded to our storage. */
export const isSellerUploadUrl = (url: string, sellerId: string): boolean => {
  const base = `${publicFileBaseUrl()}/`
  if (!url.startsWith(base)) {
    return false
  }

  const encodedKey = url.slice(base.length)
  if (!encodedKey || encodedKey.includes("?") || encodedKey.includes("#")) {
    return false
  }

  try {
    return isSellerUploadKey(decodeURIComponent(encodedKey), sellerId)
  } catch {
    return false
  }
}

const SellerImagesRowSchema = z.object({
  logo: z.string().nullish(),
  banner: z.string().nullish(),
})

const ProductImagesRowSchema = z.object({
  thumbnail: z.string().nullish(),
  images: z.array(z.object({ url: z.string() }).nullable()).nullish(),
  variants: z
    .array(z.object({ thumbnail: z.string().nullish() }).nullable())
    .nullish(),
})

/**
 * Image URLs the seller's own data already uses: store logo/banner and the
 * images of every product visible to it. Files stored before uploads were
 * keyed per seller have no marker, so unchanged values keep saving.
 */
export const getSellerKnownImageUrls = async (
  scope: MedusaContainer,
  sellerId: string
): Promise<Set<string>> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const known = new Set<string>()
  const add = (url: string | null | undefined): void => {
    if (url) {
      known.add(url)
    }
  }

  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["logo", "banner"],
    filters: { id: sellerId },
  })
  for (const seller of parseGraphRows(SellerImagesRowSchema, sellers)) {
    add(seller.logo)
    add(seller.banner)
  }

  const productIds = await getSellerVisibleProductIds(scope, sellerId)
  if (productIds.length) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["thumbnail", "images.url", "variants.thumbnail"],
      filters: { id: productIds },
    })
    for (const product of parseGraphRows(ProductImagesRowSchema, products)) {
      add(product.thumbnail)
      for (const image of product.images ?? []) {
        add(image?.url)
      }
      for (const variant of product.variants ?? []) {
        add(variant?.thumbnail)
      }
    }
  }

  return known
}

/**
 * Throws unless every URL is the seller's own upload or already used by its
 * own data. Empty values (clearing a field) are always allowed.
 */
export const assertSellerImageUrls = async (
  scope: MedusaContainer,
  sellerId: string,
  urls: ReadonlyArray<string | null | undefined>
): Promise<void> => {
  const pending = [
    ...new Set(
      urls.filter(
        (url): url is string =>
          typeof url === "string" &&
          url.length > 0 &&
          !isSellerUploadUrl(url, sellerId)
      )
    ),
  ]

  if (!pending.length) {
    return
  }

  const known = await getSellerKnownImageUrls(scope, sellerId)
  if (pending.every((url) => known.has(url))) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Images must be files uploaded by your store",
    SELLER_IMAGE_NOT_OWNED_CODE
  )
}
