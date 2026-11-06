import { useTranslation } from "react-i18next"

import { RouteFocusModal } from "../../../components/modals/route-focus-modal"
import { useStore } from "../../../hooks/api/store"
import { currencies } from "../../../lib/data/currencies"
import { CreateRegionForm } from "./components/create-region-form"

export const RegionCreate = () => {
  const { t } = useTranslation()
  const { store, isPending: isLoading, isError, error } = useStore()

  const storeCurrencies = (store?.supported_currencies ?? []).map(
    (c) => currencies[c.currency_code.toUpperCase()]
  )

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="region-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("regions.createRegion")}</span>
      </RouteFocusModal.Title>
      {!isLoading && store && <CreateRegionForm currencies={storeCurrencies} />}
    </RouteFocusModal>
  )
}
