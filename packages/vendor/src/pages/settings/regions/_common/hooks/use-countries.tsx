import type { StaticCountry } from "@lib/data/countries"
import { getLocalizedCountryName } from "@lib/format-country-name"

const acceptedOrderKeys = ["name", "code"]

/** Locale-aware lower-casing (Turkish İ/ı); an invalid tag falls back. */
const toSearchCase = (value: string, locale: string): string => {
  try {
    return value.toLocaleLowerCase(locale)
  } catch {
    return value.toLowerCase()
  }
}

/**
 * Since countries cannot be retrieved from the API, we need to create a hook
 * that can be used to filter and sort the static list of countries.
 *
 * `display_name` is replaced with the name in the panel language, and the
 * whole list is searched and sorted by that name before it is paged — the
 * static data only carries English names, and sorting after slicing only
 * reordered rows inside the current page.
 */
export const useCountries = ({
  countries,
  q,
  order = "name",
  limit,
  offset = 0,
  locale,
}: {
  countries: StaticCountry[]
  limit: number
  offset?: number
  order?: string
  q?: string
  locale: string
}): { countries: StaticCountry[]; count: number } => {
  const localized = countries.map((country) => ({
    ...country,
    display_name:
      getLocalizedCountryName(country, locale) ?? country.display_name,
  }))

  if (order) {
    const direction = order.startsWith("-") ? -1 : 1
    const key = order.replace("-", "")

    if (!acceptedOrderKeys.includes(key)) {
      throw new Response(
        JSON.stringify(`The key ${key} is not a valid order key`),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    let collator: Intl.Collator
    try {
      collator = new Intl.Collator([locale], { sensitivity: "base" })
    } catch {
      collator = new Intl.Collator()
    }

    localized.sort((a, b) =>
      key === "code"
        ? direction * collator.compare(a.iso_2, b.iso_2)
        : direction * collator.compare(a.display_name, b.display_name)
    )
  }

  if (q) {
    const query = toSearchCase(q, locale)
    const results = localized.filter(
      (c) =>
        toSearchCase(c.display_name, locale).includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.iso_2.toLowerCase().includes(query)
    )

    return {
      countries: results,
      count: results.length,
    }
  }

  return {
    countries: localized.slice(offset, offset + limit),
    count: localized.length,
  }
}
