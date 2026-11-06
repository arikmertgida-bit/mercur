import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

import { RouteFocusModal } from "@components/modals"
import { useStockLocation } from "@hooks/api/stock-locations"
import { LocationEditSalesChannelsForm } from "./_components/edit-sales-channels-form"

const LocationSalesChannels = () => {
  const { t } = useTranslation()
  const location_id = useRequiredParam("location_id")
  const { stock_location, isPending, isError, error } = useStockLocation(
    location_id,
    {
      fields: "id,*sales_channels",
    }
  )

  const ready = !isPending && !!stock_location

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("stockLocations.salesChannels.header")}</span>
      </RouteFocusModal.Title>
      {ready && <LocationEditSalesChannelsForm location={stock_location} />}
    </RouteFocusModal>
  )
}

export const Component = LocationSalesChannels
