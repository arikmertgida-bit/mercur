import type { Locale } from "date-fns"
import enUS from "./translations/en.json"

const resources = {
  translation: enUS,
} as const

export type Resources = typeof resources

/** A translation file: nested namespaces whose leaves are message strings. */
export type TranslationTree = { [key: string]: string | TranslationTree }

/** Translation files keyed by language code, each under i18next's default namespace. */
export type TranslationResources = Record<string, { translation: TranslationTree }>

export type Language = {
  code: string
  display_name: string
  ltr: boolean
  date_locale: Locale
  /**
   * BCP-47 tag for native `Intl.*`/`Date#toLocale*` calls. Most codes are
   * already valid tags on their own; the handful that aren't (`ptBR`,
   * `ptPT`, `zhCN`, `zhTW` — i18next resource keys, not real locale tags)
   * override it below. Never pass `code` itself to an `Intl` API.
   */
  intl_locale: string
}
