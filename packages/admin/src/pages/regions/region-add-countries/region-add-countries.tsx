import { RouteFocusModal } from "../../../components/modals"
import { useRegion } from "../../../hooks/api/regions"
import { AddCountriesForm } from "./components/add-countries-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const RegionAddCountries = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const {
    region,
    isPending: isLoading,
    isError,
    error,
  } = useRegion(id, {
    fields: "*payment_providers",
  })

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="region-add-countries-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("regions.addCountries")}</span>
      </RouteFocusModal.Title>
      {!isLoading && region && <AddCountriesForm region={region} />}
    </RouteFocusModal>
  )
}
