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
}
