import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteFocusModal } from "../../../components/modals"
import { useStockLocation } from "../../../hooks/api/stock-locations"
import { LocationEditFulfillmentProvidersForm } from "./components/edit-fulfillment-providers-form"
import { useTranslation } from "react-i18next"

export const LocationFulfillmentProviders = () => {
  const { t } = useTranslation()
  const location_id = useRequiredParam("location_id")
  const { stock_location, isPending, isError, error } = useStockLocation(
    location_id,
    { fields: "id,*fulfillment_providers" }
  )

  const ready = !isPending && !!stock_location

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="location-fulfillment-providers-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("stockLocations.fulfillmentProviders.header")}</span>
      </RouteFocusModal.Title>
      {ready && (
        <LocationEditFulfillmentProvidersForm location={stock_location} />
      )}
    </RouteFocusModal>
  )
}
