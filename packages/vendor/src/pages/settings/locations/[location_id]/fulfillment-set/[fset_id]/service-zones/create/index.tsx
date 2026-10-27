import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteFocusModal } from "@components/modals"
import { useStockLocation } from "@hooks/api/stock-locations"
import { CreateServiceZoneForm } from "./_components/create-service-zone-form"
import { FulfillmentSetType } from "@pages/settings/locations/_common/constants"

function LocationCreateServiceZone() {
  const fset_id = useRequiredParam("fset_id")
  const location_id = useRequiredParam("location_id")

  const { stock_location, isPending, isFetching, isError, error } =
    useStockLocation(location_id, {
      fields: "*fulfillment_sets",
    })

  const fulfillmentSet = stock_location?.fulfillment_sets?.find(
    (f) => f.id === fset_id
  )

  const type: FulfillmentSetType =
    fulfillmentSet?.type === FulfillmentSetType.Pickup
      ? FulfillmentSetType.Pickup
      : FulfillmentSetType.Shipping

  if (!isPending && !isFetching && !fulfillmentSet) {
    throw new Response(
      JSON.stringify({
        message: `Fulfillment set with ID: ${fset_id} was not found.`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal prev={`/settings/locations/${location_id}`}>
      {fulfillmentSet && stock_location && (
        <CreateServiceZoneForm
          fulfillmentSet={fulfillmentSet}
          location={stock_location}
          type={type}
        />
      )}
    </RouteFocusModal>
  )
}

export const Component = LocationCreateServiceZone
