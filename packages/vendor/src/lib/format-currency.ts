import { getActiveIntlLocale } from "./active-intl-locale"

export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(getActiveIntlLocale(), {
    style: "currency",
    currency,
    signDisplay: "auto",
  }).format(amount)
}
