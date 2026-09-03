type CountryNameSource = {
  iso_2?: string | null
  display_name?: string | null
}

/**
 * `countries.ts` (auto-generated) only carries English `display_name`s, so
 * every country display outside the already-localized `CountrySelect`
 * combobox showed English regardless of the active locale. Also accepts the
 * backend's `AdminRegionCountry` shape (same fields, both optional) so every
 * call site — static list or API response — can share this one function.
 * `Intl.DisplayNames` resolves a proper region name in the viewer's
 * language; it falls back to the static English name for a code it can't
 * resolve, has none, or when given no country at all.
 */
export const getLocalizedCountryName = (
  country: CountryNameSource | undefined,
  locale: string,
): string | undefined => {
  if (!country) {
    return undefined
  }

  if (!country.iso_2) {
    return country.display_name ?? undefined
  }

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" })
    return displayNames.of(country.iso_2.toUpperCase()) ?? country.display_name ?? undefined
  } catch {
    return country.display_name ?? undefined
  }
}
