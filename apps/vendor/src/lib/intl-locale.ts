/**
 * i18next's vendor-panel language codes double as translation-resource keys
 * (see `../i18n/index.ts`), so 4 of the 31 supported languages use a
 * vendor-facing shorthand instead of a real BCP-47 tag: `ptBR`, `ptPT`,
 * `zhCN`, `zhTW`. Native `Intl.*` constructors and `Date#toLocale*` throw a
 * `RangeError` on those exact strings ("Incorrect locale information
 * provided"), which crashes the whole page when left uncaught. Every call
 * site that formats a date/time/number from `i18n.language` must go through
 * this first.
 */
const BCP47_OVERRIDES: Record<string, string> = {
  ptBR: "pt-BR",
  ptPT: "pt-PT",
  zhCN: "zh-CN",
  zhTW: "zh-TW",
}

export const toIntlLocale = (languageCode: string): string =>
  BCP47_OVERRIDES[languageCode] ?? languageCode
