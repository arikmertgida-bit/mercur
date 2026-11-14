import { currencies } from "./data/currencies"
import { getActiveIntlLocale } from "./active-intl-locale"

export const getDecimalDigits = (currency: string) => {
  return currencies[currency.toUpperCase()]?.decimal_digits ?? 0
}

/**
 * Returns a formatted amount based on the currency code in the active panel language
 * @param amount - The amount to format
 * @param currencyCode - The currency code to format the amount in
 * @returns - The formatted amount
 *
 * @example
 * getLocaleAmount(10, "usd") // '$10.00' when the panel language is en
 * getLocaleAmount(10, "usd") // '10,00 $' when the panel language is fr
 */
export const getLocaleAmount = (amount: number, currencyCode: string) => {
  const formatter = new Intl.NumberFormat(getActiveIntlLocale(), {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: currencyCode,
  })

  return formatter.format(amount)
}

export const getNativeSymbol = (currencyCode: string): string => {
  // Take the currency part itself: stripping digits/separators from a
  // formatted 0 left Persian digits ("₺۰٫۰۰") and RTL marks (ar/he) behind.
  const parts = new Intl.NumberFormat(getActiveIntlLocale(), {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0)

  return (
    parts.find((part) => part.type === "currency")?.value ??
    currencyCode.toUpperCase()
  )
}

/**
 * In some cases we want to display the amount with the currency code and symbol,
 * in the format of "symbol amount currencyCode". This breaks from the
 * user's locale and is only used in cases where we want to display the
 * currency code and symbol explicitly, e.g. for totals.
 */
export const getStylizedAmount = (amount: number, currencyCode: string) => {
  const symbol = getNativeSymbol(currencyCode)
  const decimalDigits = getDecimalDigits(currencyCode)

  const lessThanRoundingPrecission = isAmountLessThenRoundingError(
    amount,
    currencyCode
  )

  const total = amount.toLocaleString(getActiveIntlLocale(), {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
    signDisplay: lessThanRoundingPrecission ? "exceptZero" : "auto",
  })

  return `${symbol} ${total} ${currencyCode.toUpperCase()}`
}

/**
 * Returns true if the amount is less than the rounding error for the currency
 * @param amount - The amount to check
 * @param currencyCode - The currency code to check the amount in
 * @returns - True if the amount is less than the rounding error, false otherwise
 *
 * For example returns true if amount is < 0.005 for a USD | EUR etc.
 */
export const isAmountLessThenRoundingError = (
  amount: number,
  currencyCode: string
) => {
  const decimalDigits = getDecimalDigits(currencyCode)
  return Math.abs(amount) < 1 / 10 ** decimalDigits / 2
}
