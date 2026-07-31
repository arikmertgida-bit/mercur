/**
 * Mirrors packages/admin/src/i18n/languages.ts — kept in sync manually since
 * the API doesn't depend on the admin UI package.
 */
export const SUPPORTED_ADMIN_LANGUAGES = [
  "ar", "bg", "bs", "cs", "de", "el", "es", "fa", "fr", "he", "hu", "id",
  "it", "ja", "ko", "lt", "mk", "mn", "nl", "pl", "ptBR", "ptPT", "ro",
  "ru", "th", "tr", "uk", "vi", "zhCN", "zhTW",
] as const

export type AdminLanguage = (typeof SUPPORTED_ADMIN_LANGUAGES)[number]

const SUPPORTED_SET: ReadonlySet<string> = new Set(SUPPORTED_ADMIN_LANGUAGES)

function isAdminLanguage(value: string): value is AdminLanguage {
  return SUPPORTED_SET.has(value)
}

/**
 * i18next language codes aren't valid BCP-47 (`ptBR`, `zhCN`, no hyphen), so
 * `Accept-Language` values need light normalization before matching —
 * `pt-BR` / `pt_BR` -> `ptBR`, `zh-CN` -> `zhCN`, `tr-TR` -> `tr`, etc.
 */
function normalizeLanguageTag(tag: string): string {
  const cleaned = tag.trim().replace(/[-_]/g, "")
  const lower = cleaned.toLowerCase()

  const exactMatch = SUPPORTED_ADMIN_LANGUAGES.find(
    (lang) => lang.toLowerCase() === lower
  )
  if (exactMatch) {
    return exactMatch
  }

  // Fall back to the base subtag (e.g. "tr-TR" -> "tr", "en-US" -> "en").
  const base = tag.trim().split(/[-_]/)[0]?.toLowerCase() ?? ""
  const baseMatch = SUPPORTED_ADMIN_LANGUAGES.find(
    (lang) => lang.toLowerCase() === base
  )
  return baseMatch ?? base
}

/**
 * Resolves the admin's active language from a raw `Accept-Language` header.
 * Returns `"en"` (no translation — the caller delegates to Medusa's default
 * handler) when the header is missing or doesn't match a supported language.
 */
export function resolveAdminLanguage(
  acceptLanguageHeader: string | undefined
): AdminLanguage | "en" {
  if (!acceptLanguageHeader) {
    return "en"
  }

  const candidates = acceptLanguageHeader
    .split(",")
    .map((part) => part.split(";")[0]?.trim() ?? "")
    .filter((part) => part.length > 0)

  for (const candidate of candidates) {
    const normalized = normalizeLanguageTag(candidate)
    if (isAdminLanguage(normalized)) {
      return normalized
    }
  }

  return "en"
}
