/**
 * The vendor panel's language codes are BCP-47 tags (`pt-BR`, `zh-CN`, …,
 * see `packages/vendor/src/i18n/languages.ts`), but a `lng` cookie or
 * localStorage value saved before that switch can still hold the old
 * shorthand: `ptBR`, `ptPT`, `zhCN`, `zhTW`. Native `Intl.*` constructors and
 * `Date#toLocale*` throw a `RangeError` on those exact strings ("Incorrect
 * locale information provided"), which crashes the whole page when left
 * uncaught. Every call site that formats a date/time/number from
 * `i18n.language` must go through this first.
 */
const BCP47_OVERRIDES: Record<string, string> = {
  ptBR: "pt-BR",
  ptPT: "pt-PT",
  zhCN: "zh-CN",
  zhTW: "zh-TW",
}

export const toIntlLocale = (languageCode: string): string =>
  BCP47_OVERRIDES[languageCode] ?? languageCode
