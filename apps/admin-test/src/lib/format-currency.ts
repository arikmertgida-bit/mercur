import { toIntlLocale } from "./intl-locale"

export const formatCurrency = (
  amount: number,
  currencyCode: string,
  locale: string
): string => {
  const intlLocale = toIntlLocale(locale)

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return amount.toLocaleString(intlLocale)
  }
}
