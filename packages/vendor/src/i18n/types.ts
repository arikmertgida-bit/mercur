import enUS from "./translations/en.json"

const resources = {
  translation: enUS,
} as const

export type Resources = typeof resources

/** A translation file: nested namespaces whose leaves are message strings. */
export type TranslationTree = { [key: string]: string | TranslationTree }

/** Translations keyed by language code, then by i18next namespace ("translation" is the default one). */
export type TranslationResources = Record<string, Record<string, TranslationTree>>

/** A lazily imported translation file (`() => import("./tr.json")`). */
export type TranslationModule = { default: TranslationTree }

/** One loader per language; each file becomes its own chunk. */
export type TranslationLoaders = Record<string, () => Promise<TranslationModule>>

export type Language = {
  code: string
  display_name: string
  ltr: boolean
  /**
   * BCP-47 tag for native `Intl.*`/`Date#toLocale*` calls. Most codes are
   * already valid tags on their own; the handful that aren't (`ptBR`,
   * `ptPT`, `zhCN`, `zhTW` — i18next resource keys, not real locale tags)
   * override it below. Never pass `code` itself to an `Intl` API.
   */
  intl_locale: string
}
