import type { BackendModule, ReadCallback } from "i18next"

import { loadDateLocale } from "./date-locales"
import { translationLoaders } from "./translations"
import type {
  TranslationLoaders,
  TranslationResources,
  TranslationTree,
} from "./types"

const TRANSLATION_NAMESPACE = "translation"

export function deepMerge(
  target: TranslationTree,
  source: TranslationTree
): TranslationTree {
  const result: TranslationTree = { ...target }

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key]

    result[key] =
      typeof sourceValue === "object" && typeof targetValue === "object"
        ? deepMerge(targetValue, sourceValue)
        : sourceValue
  }

  return result
}

/** Languages the panel can show: built-in files plus app-only languages. */
export const getAvailableLanguages = (
  custom: TranslationResources,
  appLoaders: TranslationLoaders = {}
): string[] => [
  ...new Set([
    ...Object.keys(translationLoaders),
    ...Object.keys(custom),
    ...Object.keys(appLoaders),
  ]),
]

const loadTree = (
  load: (() => Promise<{ default: TranslationTree }>) | undefined
): Promise<TranslationTree> =>
  load ? load().then((module) => module.default) : Promise.resolve({})

/**
 * i18next backend that loads a language on demand: the panel's built-in file,
 * the app's own file (`translationLoaders` from `virtual:mercur/i18n`) and the
 * language's date-fns locale, each its own chunk. Plugin resources (the
 * virtual module's default export) go over the built-in file and the app file
 * over both. Only the active language and its fallback are ever fetched.
 */
export const createTranslationBackend = (
  custom: TranslationResources,
  appLoaders: TranslationLoaders = {}
): BackendModule => ({
  type: "backend",
  init: () => undefined,
  read: (language: string, namespace: string, callback: ReadCallback) => {
    if (namespace !== TRANSLATION_NAMESPACE) {
      callback(null, custom[language]?.[namespace] ?? {})
      return
    }

    Promise.all([
      loadTree(translationLoaders[language]),
      loadTree(appLoaders[language]),
      loadDateLocale(language),
    ])
      .then(([builtIn, app]) =>
        callback(
          null,
          deepMerge(deepMerge(builtIn, custom[language]?.translation ?? {}), app)
        )
      )
      .catch((error: Error) => callback(error, null))
  },
})
