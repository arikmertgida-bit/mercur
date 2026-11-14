import { cleanValue } from "react-currency-input-field"
import { describe, expect, test } from "vitest"

import { languages } from "../../i18n/languages"
import { castNumber } from "../cast-number"
import { getNumberInputLocale, toCanonicalDecimal } from "../number-input-locale"

const parse = (typed: string, locale: string): number => {
  const { decimalSeparator, groupSeparator } = getNumberInputLocale(locale)
  return castNumber(cleanValue({ value: typed, decimalSeparator, groupSeparator }))
}

describe("number input locale", () => {
  test("tr and en parse their own grouped amounts to the same price", () => {
    expect(parse("1.050,00", "tr")).toBe(1050)
    expect(parse("1,050.00", "en")).toBe(1050)
  })

  test("locales without 4-digit grouping keep distinct separators", () => {
    for (const locale of ["es", "pl", "it", "hu", "bg", "pt-PT"]) {
      const { decimalSeparator, groupSeparator } = getNumberInputLocale(locale)
      expect(groupSeparator).not.toBe(decimalSeparator)
      expect(parse("10,50", locale)).toBe(10.5)
    }
  })

  test("every panel language uses latin digits and a parseable decimal", () => {
    for (const { code } of languages) {
      const config = getNumberInputLocale(code)
      expect([".", ","]).toContain(config.decimalSeparator)
      expect(config.intlConfig.locale).toContain("-u-nu-latn")
      expect(new Intl.NumberFormat(config.intlConfig.locale).format(1050)).toMatch(/^1\D?050$/)
    }
  })

  test("invalid or missing locale falls back to the dot convention", () => {
    expect(getNumberInputLocale(undefined).decimalSeparator).toBe(".")
    expect(getNumberInputLocale("not a tag").decimalSeparator).toBe(".")
  })

  test("canonical decimal never yields NaN", () => {
    expect(toCanonicalDecimal("2500", 2)).toBe("2500.00")
    expect(toCanonicalDecimal(12.5, 2)).toBe("12.50")
    expect(toCanonicalDecimal("abc", 2)).toBe("")
    expect(toCanonicalDecimal(undefined, 2)).toBe("")
  })
})
