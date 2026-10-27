// Route: /orders/:id/:f_id/create-shipment
import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteFocusModal } from "@components/modals"
import { useOrder } from "@hooks/api/orders"
import { OrderCreateShipmentForm } from "./order-create-shipment-form"

export const Component = () => {
  const id = useRequiredParam("id")
  const fulfillmentId = useRequiredParam("f_id")

  const { order, isLoading, isError, error } = useOrder(id, {
    // Use `fulfillments.*` + `fulfillments.<rel>.*` rather than stacking
    // multiple `*fulfillments…` segments — the query parser reads
    // `*fulfillments.items` as a literal property on Order and 500s.
    fields: "fulfillments.*,fulfillments.items.*,fulfillments.labels.*",
  })

  if (isError) {
    throw error
  }

  const ready = !isLoading && order

  const fulfillment = order?.fulfillments?.find((f) => f.id === fulfillmentId)

  return (
    <RouteFocusModal>
      {ready && fulfillment && (
        <OrderCreateShipmentForm
          order={order}
          fulfillment={fulfillment}
        />
      )}
    </RouteFocusModal>
  )
}
