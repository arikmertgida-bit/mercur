type CountryNameSource = {
  iso_2?: string | null
  display_name?: string | null
}

/**
 * `data/countries.ts` and the API only carry English `display_name`s, so
 * every country shown in the panel was English regardless of the active
 * language. `Intl.DisplayNames` resolves the region name in the panel
 * language (admin language codes are already BCP-47 tags, e.g. "pt-BR"); it
 * falls back to the English name for a code it can't resolve, has none, or
 * when given no country at all. Accepts both the static country list and
 * the backend's region-country shape (same fields, both optional).
 */
export const getLocalizedCountryName = (
  country: CountryNameSource | undefined,
  locale: string
): string | undefined => {
  if (!country) {
    return undefined
  }

  if (!country.iso_2) {
    return country.display_name ?? undefined
  }

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" })
    return (
      displayNames.of(country.iso_2.toUpperCase()) ??
      country.display_name ??
      undefined
    )
  } catch {
    return country.display_name ?? undefined
  }
}

/**
 * Static/API country lists with `display_name` replaced by the panel-language
 * name and sorted by it, so pickers and tables read (and search) naturally
 * in every language instead of alphabetised English.
 */
export const localizeCountryList = <
  T extends { iso_2: string; display_name: string },
>(
  list: T[],
  locale: string
): T[] => {
  let collator: Intl.Collator
  try {
    collator = new Intl.Collator([locale], { sensitivity: "base" })
  } catch {
    collator = new Intl.Collator()
  }

  return list
    .map((country) => ({
      ...country,
      display_name:
        getLocalizedCountryName(country, locale) ?? country.display_name,
    }))
    .sort((a, b) => collator.compare(a.display_name, b.display_name))
}
