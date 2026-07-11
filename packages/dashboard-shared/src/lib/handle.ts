/**
 * Explicit transliteration for letters that do not decompose into a
 * base letter + combining diacritic under Unicode NFD normalization
 * (so a generic accent-strip pass would otherwise leave them untouched
 * or destroy them). Mirrors what a native speaker expects as the
 * ASCII-safe rendering of their own script.
 */
const NON_DECOMPOSING_LETTER_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ğ: "g",
  Ğ: "g",
  ş: "s",
  Ş: "s",
  ß: "ss",
  ø: "o",
  Ø: "o",
  œ: "oe",
  Œ: "oe",
  æ: "ae",
  Æ: "ae",
  đ: "d",
  Đ: "d",
  þ: "th",
  Þ: "th",
  ð: "d",
  Ð: "d",
}

const DIACRITIC_MARK_PATTERN = /[\u0300-\u036f]/g
const NON_SLUG_CHAR_PATTERN = /[^a-z0-9\s-]/g
const WHITESPACE_OR_UNDERSCORE_PATTERN = /[\s_]+/g
const REPEATED_HYPHEN_PATTERN = /-+/g
const LEADING_OR_TRAILING_HYPHEN_PATTERN = /^-|-$/g

const transliterateNonDecomposingLetters = (value: string): string =>
  Array.from(value)
    .map((char) => NON_DECOMPOSING_LETTER_MAP[char] ?? char)
    .join("")

const randomSlugSuffix = (): string =>
  Math.random().toString(36).slice(2, 8)

/**
 * Derives a URL-safe, globally consistent handle (slug) from a free-text
 * name/title, for any source language. Output is always lowercase ASCII
 * letters, digits, and hyphens — never raw Unicode — so URLs behave
 * identically across browsers, ad platforms, SMS, and printed material
 * regardless of the seller's or product's origin language.
 *
 * Latin-script languages with diacritics (Turkish, French, German,
 * Vietnamese, Nordic languages, ...) are transliterated letter-by-letter
 * (e.g. "Göçebe Rüzgarı" -> "gocebe-ruzgari"). Non-Latin scripts (Chinese,
 * Arabic, Japanese, Korean, Thai, Cyrillic, ...) have no letter-by-letter
 * ASCII equivalent, so when transliteration would leave nothing behind,
 * a short random suffix is generated instead — the same fallback strategy
 * the backend's own toHandle() uses when a name reduces to nothing.
 */
export const toHandle = (value: string): string => {
  const transliterated = transliterateNonDecomposingLetters(value)
  const normalized = transliterated
    .normalize("NFD")
    .replace(DIACRITIC_MARK_PATTERN, "")
    .toLowerCase()

  const slug = normalized
    .replace(NON_SLUG_CHAR_PATTERN, "")
    .trim()
    .replace(WHITESPACE_OR_UNDERSCORE_PATTERN, "-")
    .replace(REPEATED_HYPHEN_PATTERN, "-")
    .replace(LEADING_OR_TRAILING_HYPHEN_PATTERN, "")

  return slug.length > 0 ? slug : `item-${randomSlugSuffix()}`
}

/**
 * 1:1 port of the backend's isValidHandle (@medusajs/utils). Kept in sync
 * intentionally rather than imported, since the framework package is a
 * server-only dependency the dashboards don't otherwise install. Used as
 * defense-in-depth Zod validation on auto-derived handle fields, so a
 * future regression in toHandle() fails the form instead of reaching
 * the backend.
 */
export const isValidHandleFormat = (value: string): boolean => {
  if (value.length === 0) {
    return false
  }

  if (/[A-Z]/.test(value)) {
    return false
  }

  return /^[\p{Ll}\p{Lo}\p{Lm}\p{N}]+(?:-[\p{Ll}\p{Lo}\p{Lm}\p{N}]+)*$/u.test(
    value,
  )
}
