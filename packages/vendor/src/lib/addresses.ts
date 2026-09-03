import { HttpTypes } from "@medusajs/types"

import { countries, getCountryByIso2 } from "./data/countries"
import { getLocalizedCountryName } from "./format-country-name"

/**
 * These are plain (non-hook) helpers called from many places, some without
 * easy access to `useTranslation()`'s `i18n.language`. Callers should always
 * pass it explicitly; this is only a graceful fallback so an update that
 * misses one never regresses back to hardcoded English.
 */
const fallbackLocale = (): string =>
  typeof navigator !== "undefined" ? navigator.language : "en"

export const isSameAddress = (
  a?: HttpTypes.AdminOrderAddress | null,
  b?: HttpTypes.AdminOrderAddress | null
) => {
  if (!a || !b) {
    return false
  }

  return (
    a.first_name === b.first_name &&
    a.last_name === b.last_name &&
    a.address_1 === b.address_1 &&
    a.address_2 === b.address_2 &&
    a.city === b.city &&
    a.postal_code === b.postal_code &&
    a.province === b.province &&
    a.country_code === b.country_code
  )
}

export const getFormattedAddress = ({
  address,
  locale = fallbackLocale(),
}: {
  locale?: string
  address?: {
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    postal_code?: string | null
    province?: string | null
    country_code?: string | null
    country?: {
      display_name?: string | null
    } | null
  } | null
}) => {
  if (!address) {
    return []
  }

  const {
    first_name,
    last_name,
    company,
    address_1,
    address_2,
    city,
    postal_code,
    province,
    country,
    country_code,
  } = address

  const name = [first_name, last_name].filter(Boolean).join(" ")

  const formattedAddress: string[] = []

  if (name) {
    formattedAddress.push(name)
  }

  if (company) {
    formattedAddress.push(company)
  }

  if (address_1) {
    formattedAddress.push(address_1)
  }

  if (address_2) {
    formattedAddress.push(address_2)
  }

  const cityProvincePostal = [city, province, postal_code]
    .filter(Boolean)
    .join(" ")

  if (cityProvincePostal) {
    formattedAddress.push(cityProvincePostal)
  }

  if (country) {
    formattedAddress.push(
      getLocalizedCountryName(
        { iso_2: country_code, display_name: country.display_name },
        locale,
      ) ?? country.display_name!,
    )
  } else if (country_code) {
    const country = getCountryByIso2(country_code)

    if (country) {
      formattedAddress.push(getLocalizedCountryName(country, locale) ?? country.display_name)
    } else {
      formattedAddress.push(country_code.toUpperCase())
    }
  }

  return formattedAddress
}

export const getFormattedCountry = (
  countryCode: string | null | undefined,
  locale: string = fallbackLocale(),
) => {
  if (!countryCode) {
    return ""
  }

  const country = countries.find((c) => c.iso_2 === countryCode)
  if (!country) {
    return countryCode
  }
  return getLocalizedCountryName(country, locale) ?? country.display_name
}
