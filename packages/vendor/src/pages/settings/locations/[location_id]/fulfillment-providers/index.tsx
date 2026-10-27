
import { SectionNoAccess, useCan, useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteFocusModal } from "@components/modals"
import { useStockLocation } from "@hooks/api/stock-locations"
import { LocationEditFulfillmentProvidersForm } from "./_components/edit-fulfillment-providers-form"

const LocationFulfillmentProviders = () => {
  const location_id = useRequiredParam("location_id")
  const { stock_location, isPending, isError, error } = useStockLocation(
    location_id,
    { fields: "id,*fulfillment_providers" }
  )

  const canViewFulfillmentSets = useCan("fulfillment_sets")

  const ready = !isPending && !!stock_location

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {!canViewFulfillmentSets && <SectionNoAccess />}
      {ready && canViewFulfillmentSets && (
        <LocationEditFulfillmentProvidersForm location={stock_location} />
      )}
    </RouteFocusModal>
  )
}

export const Component = LocationFulfillmentProviders
