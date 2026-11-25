import type { BackendModule, ReadCallback } from "i18next"

import { translationLoaders } from "./translations"
import type { TranslationResources, TranslationTree } from "./types"

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
  custom: TranslationResources
): string[] => [
  ...new Set([...Object.keys(translationLoaders), ...Object.keys(custom)]),
]

/**
 * i18next backend that loads a language's built-in file on demand (its own
 * chunk) and merges the app's own translations (`virtual:mercur/i18n`) over
 * it. Only the active language and its fallback are ever fetched.
 */
export const createTranslationBackend = (
  custom: TranslationResources
): BackendModule => ({
  type: "backend",
  init: () => undefined,
  read: (language: string, namespace: string, callback: ReadCallback) => {
    if (namespace !== TRANSLATION_NAMESPACE) {
      callback(null, {})
      return
    }

    const extra = custom[language]?.translation ?? {}
    const load = translationLoaders[language]

    if (!load) {
      callback(null, extra)
      return
    }

    load()
      .then((module) => callback(null, deepMerge(module.default, extra)))
      .catch((error: Error) => callback(error, null))
  },
})
