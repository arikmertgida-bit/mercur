const MAX_PREFIX_LENGTH = 20
const FALLBACK_PREFIX = "MAGAZA"
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g")

/**
 * Turns a seller handle into an ASCII, keyboard-safe prefix for a
 * system-generated promotion code. `.normalize("NFD")` decomposes
 * precomposed Latin letters (ç, ğ, ö, ş, ü, é, ñ, ...) into a base
 * letter plus a combining diacritic, which the regex below strips —
 * this also correctly resolves Turkish dotless "ı" (its default,
 * non-locale uppercase mapping is "I") without a Turkish-locale
 * uppercase call, so it can't hit the classic tr-locale "İ/I" bug.
 * Scripts with no Latin/digit content (Arabic, CJK, Cyrillic, ...) are
 * dropped entirely by the final strip, so the seller id is used as a
 * fallback to still produce a unique, non-empty, ASCII prefix.
 */
export const buildPromotionCodePrefix = (
  sellerHandle: string,
  sellerId: string
): string => {
  const asciiOnly = sellerHandle
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

  if (asciiOnly.length > 0) {
    return asciiOnly.slice(0, MAX_PREFIX_LENGTH)
  }

  const idSuffix = sellerId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase()

  return idSuffix.length > 0 ? `${FALLBACK_PREFIX}${idSuffix}` : FALLBACK_PREFIX
}
