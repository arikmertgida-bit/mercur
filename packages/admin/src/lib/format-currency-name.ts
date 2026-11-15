import { getActiveIntlLocale } from "./active-intl-locale"
import { currencies } from "./data/currencies"

/**
 * `data/currencies.ts` and the API only carry English currency names.
 * `Intl.DisplayNames` names the currency in the panel language; the few ISO
 * codes it does not know (historical/precious-metal codes) keep the English
 * name.
 */
export const getLocalizedCurrencyName = (
  code: string,
  locale: string | undefined = getActiveIntlLocale()
): string => {
  const normalizedCode = code.toUpperCase()
  const fallbackName = currencies[normalizedCode]?.name ?? normalizedCode

  try {
    const displayNames = new Intl.DisplayNames(locale ? [locale] : [], {
      type: "currency",
    })
    return displayNames.of(normalizedCode) ?? fallbackName
  } catch {
    return fallbackName
  }
}
