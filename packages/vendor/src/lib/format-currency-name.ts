import { currencies } from "./data/currencies"

/**
 * `currencies.ts` (auto-generated from an upstream dataset) only carries
 * English names, so every currency picker/display showed English text
 * regardless of the active locale. `Intl.DisplayNames` resolves a proper
 * name in the viewer's language; it doesn't recognize every ISO 4217 code
 * (a handful of historical/precious-metal codes aren't in its registry),
 * so unresolved codes fall back to the static English name.
 */
export const getLocalizedCurrencyName = (
  code: string,
  locale: string,
): string => {
  const normalizedCode = code.toUpperCase()
  const fallbackName = currencies[normalizedCode]?.name ?? normalizedCode

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "currency" })
    return displayNames.of(normalizedCode) ?? fallbackName
  } catch {
    return fallbackName
  }
}
