import { isForbidden, usePermissions } from "@mercurjs/dashboard-shared"

import { useRegions } from "../../../../hooks/api/regions"
import { useStore } from "../../../../hooks/api/store"
import { usePricePreferences } from "../../../../hooks/api/price-preferences"

/**
 * Currency source mirrors `@mercurjs/admin`'s own price-list currency-data
 * hook: the store's full `supported_currencies` list, not the seller's own
 * single onboarding currency. A price list lets a seller price a product in
 * ANY currency/region the marketplace operates in — the seller's own
 * `currency_code` is only their default reporting currency (fixed at
 * onboarding, see `edit-store-form.tsx`), not a ceiling on which currencies
 * they can sell in. Extracted to `string[]` here (unlike admin's version,
 * which keeps the full objects) to match this package's existing
 * `currencies: string[]` prop chain through `PriceListCreateForm` →
 * `PriceListPricesForm` → `usePriceListGridColumns`.
 */
export const usePriceListCurrencyData = () => {
  const { can } = usePermissions()
  const canViewRegions = can("regions")
  const canViewPreferences = can("price_preferences")

  const {
    store,
    isPending: isStorePending,
    isError: isStoreError,
    error: storeError,
  } = useStore({
    fields: "+supported_currencies",
  })

  const currencies = store?.supported_currencies?.map((c) => c.currency_code)

  const {
    regions,
    isPending: isRegionsPending,
    isError: isRegionsError,
    error: regionsError,
  } = useRegions(
    {
      fields: "id,name,currency_code",
      limit: 999,
    },
    { enabled: canViewRegions }
  )

  const {
    price_preferences: pricePreferences,
    isPending: isPreferencesPending,
    isError: isPreferencesError,
    error: preferencesError,
  } = usePricePreferences({}, { enabled: canViewPreferences })

  const isReady =
    !!currencies &&
    !!regions &&
    !!pricePreferences &&
    !isStorePending &&
    !isRegionsPending &&
    !isPreferencesPending

  const isNoAccess =
    !canViewRegions ||
    !canViewPreferences ||
    isForbidden(regionsError) ||
    isForbidden(preferencesError)

  if (isRegionsError && !isForbidden(regionsError)) {
    throw regionsError
  }

  if (isStoreError) {
    throw storeError
  }

  if (isPreferencesError && !isForbidden(preferencesError)) {
    throw preferencesError
  }

  if (!isReady || isNoAccess) {
    return {
      regions: undefined,
      currencies: undefined,
      pricePreferences: undefined,
      isReady: false,
      isNoAccess,
    }
  }

  return { regions, currencies, pricePreferences, isReady, isNoAccess }
}
