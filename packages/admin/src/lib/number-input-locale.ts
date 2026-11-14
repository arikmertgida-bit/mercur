import { useMemo } from "react"
import type { IntlConfig } from "react-currency-input-field"
import { useTranslation } from "react-i18next"

import { getActiveIntlLocale } from "./active-intl-locale"

/**
 * Props for `react-currency-input-field` so number INPUT follows the same
 * convention the panel uses to DISPLAY amounts (tr types "1.050,00", en
 * "1,050.00") instead of the browser/OS locale. Why every field:
 * - `intlConfig` with Latin digits forced (`-u-nu-latn`): without it the
 *   library formats with the browser default, so a Persian browser gets
 *   "۱۰۵۰" digits that never parse back.
 * - explicit separators from a 7-digit sample: the library probes with
 *   1000.1, which es/pl/it/hu/bg/pt-PT don't group (CLDR minimum grouping
 *   digits = 2). Its group separator then falls back to "," — equal to the
 *   decimal separator — and the input either throws or saves "10,50" as 1050.
 */
export type NumberInputLocale = {
  intlConfig: IntlConfig
  decimalSeparator: string
  groupSeparator: string
}

const FALLBACK_LOCALE = "en"
const GROUPED_SAMPLE = 1234567.5
const FALLBACK: NumberInputLocale = {
  intlConfig: { locale: FALLBACK_LOCALE },
  decimalSeparator: ".",
  groupSeparator: ",",
}

export const getNumberInputLocale = (
  locale: string | undefined
): NumberInputLocale => {
  try {
    const tag = new Intl.Locale(locale ?? FALLBACK_LOCALE, {
      numberingSystem: "latn",
    }).toString()
    const parts = new Intl.NumberFormat(tag).formatToParts(GROUPED_SAMPLE)
    const decimalSeparator = parts.find((part) => part.type === "decimal")?.value
    const groupSeparator = parts.find((part) => part.type === "group")?.value
    if (
      decimalSeparator &&
      groupSeparator &&
      decimalSeparator !== groupSeparator
    ) {
      return { intlConfig: { locale: tag }, decimalSeparator, groupSeparator }
    }
  } catch {
    // Invalid language tag → fall back to the "." decimal convention.
  }
  return FALLBACK
}

/** Re-renders on panel language change (via `useTranslation`). */
export const useNumberInputLocale = (): NumberInputLocale => {
  useTranslation()
  const locale = getActiveIntlLocale()
  return useMemo(() => getNumberInputLocale(locale), [locale])
}

/**
 * Locale-independent "." decimal string ("2500.00") used as the input's
 * `value`; the input itself applies the separators above when rendering.
 * Returns "" for empty or non-numeric values so "NaN" never reaches a form.
 */
export const toCanonicalDecimal = (
  value: string | number | undefined,
  decimalDigits: number
): string => {
  if (value === undefined || value === "") {
    return ""
  }
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(decimalDigits) : ""
}
