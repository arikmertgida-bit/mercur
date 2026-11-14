import i18n from "i18next"

import { toIntlLocale } from "../i18n/languages"

/**
 * BCP-47 tag of the active panel language, for `Intl.*` money/number
 * formatters (tr → "₺3.750,00", en → "₺3,750.00"). Formatting follows the
 * language the user picked in the panel, not the browser/OS locale.
 * Returns `undefined` (= runtime default) before i18next is initialised or
 * when the code is not a valid tag, so formatting never throws.
 */
export const getActiveIntlLocale = (): string | undefined => {
  const language = i18n.resolvedLanguage ?? i18n.language
  if (!language) {
    return undefined
  }
  try {
    return Intl.getCanonicalLocales(toIntlLocale(language))[0]
  } catch {
    return undefined
  }
}
