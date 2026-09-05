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

export type SellerSkuSource = {
  id: string
  handle?: string | null
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
 * Store-only SKU (never derived from a title): a seller code plus a
 * time+random suffix. The suffix makes collisions astronomically unlikely
 * across a marketplace-wide catalog without a server round-trip; the
 * backend's own unique constraint on the sku column remains the final
 * guarantee. Shared by every vendor create-flow that mints a SKU on the
 * seller's behalf (variant/offer/inventory-item creation) — SKU is
 * permanently read-only for sellers everywhere else.
 */
export const generateVariantSku = (seller: SellerSkuSource): string => {
  const sellerCode = getSellerSkuCode(seller)
  const uniqueSuffix = generateSkuUniqueSuffix()

  return [sellerCode, uniqueSuffix].join(SKU_SEGMENT_SEPARATOR)
}
