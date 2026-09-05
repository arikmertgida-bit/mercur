export const formatCurrency = (
  amount: number,
  currencyCode: string,
  locale: string
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return amount.toLocaleString(locale)
  }
}
