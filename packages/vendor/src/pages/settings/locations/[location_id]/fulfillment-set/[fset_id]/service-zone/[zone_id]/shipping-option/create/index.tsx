import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useSearchParams } from "react-router-dom"

import { RouteFocusModal } from "@components/modals"
import { useStockLocation } from "@hooks/api/stock-locations"
import { CreateShippingOptionsForm } from "./_components/create-shipping-options-form"
import { LOC_CREATE_SHIPPING_OPTION_FIELDS } from "./constants"
import { toFulfillmentSetType } from "@pages/settings/locations/_common/constants"

function LocationServiceZoneShippingOptionCreate() {
  const location_id = useRequiredParam("location_id")
  const fset_id = useRequiredParam("fset_id")
  const zone_id = useRequiredParam("zone_id")
  const [searchParams] = useSearchParams()
  const isReturn = searchParams.has("is_return")

  const { stock_location, isPending, isFetching, isError, error } =
    useStockLocation(location_id, {
      fields: LOC_CREATE_SHIPPING_OPTION_FIELDS,
    })

  const fulfillmentSet = stock_location?.fulfillment_sets?.find(
    (f) => f.id === fset_id
  )

  if (!isPending && !isFetching && !fulfillmentSet) {
    throw new Response(
      JSON.stringify({
        message: `Fulfillment set with ID ${fset_id} was not found`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  const zone = fulfillmentSet?.service_zones?.find((z) => z.id === zone_id)

  if (!isPending && !isFetching && !zone) {
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
    <RouteFocusModal prev={`/settings/locations/${location_id}`}>
      {zone && fulfillmentSet && (
        <CreateShippingOptionsForm
          zone={zone}
          isReturn={isReturn}
          locationId={location_id}
          type={toFulfillmentSetType(fulfillmentSet.type)}
        />
      )}
    </RouteFocusModal>
  )
}

export const Component = LocationServiceZoneShippingOptionCreate
