import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { RouteDrawer } from "@components/modals"
import { useStockLocation } from "@hooks/api/stock-locations"
import { EditServiceZoneForm } from "./_components/edit-service-zone-form"

const LocationServiceZoneEdit = () => {
  const { t } = useTranslation()
  const location_id = useRequiredParam("location_id")
  const fset_id = useRequiredParam("fset_id")
  const zone_id = useRequiredParam("zone_id")

  const { stock_location, isPending, isFetching, isError, error } =
    useStockLocation(location_id, {
      fields: "*fulfillment_sets.service_zones",
    })

  const serviceZone = stock_location?.fulfillment_sets
    ?.find((f) => f.id === fset_id)
    ?.service_zones.find((z) => z.id === zone_id)

  if (!isPending && !isFetching && !serviceZone) {
    throw new Response(
      JSON.stringify({
        message: `Service zone with ID ${zone_id} was not found`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer prev={`/settings/locations/${location_id}`}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("stockLocations.serviceZones.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {serviceZone && (
        <EditServiceZoneForm
          zone={serviceZone}
          fulfillmentSetId={fset_id}
          locationId={location_id}
        />
      )}
    </RouteDrawer>
  )
}

export const Component = LocationServiceZoneEdit
