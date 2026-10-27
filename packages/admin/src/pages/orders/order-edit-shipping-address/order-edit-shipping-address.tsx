import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { RouteDrawer } from "../../../components/modals"
import { useOrder } from "../../../hooks/api"
import { DEFAULT_FIELDS } from "../order-detail/constants"
import { EditOrderShippingAddressForm } from "./components/edit-order-shipping-address-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const OrderEditShippingAddress = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { order, isPending, isError } = useOrder(id, {
    fields: DEFAULT_FIELDS,
  })

  if (!isPending && isError) {
    throw new Error("Order not found")
  }

  return (
    <RouteDrawer data-testid="order-edit-shipping-address-drawer">
      <RouteDrawer.Header data-testid="order-edit-shipping-address-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="order-edit-shipping-address-heading">{t("orders.edit.shippingAddress.title")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {order && <EditOrderShippingAddressForm order={order} />}
    </RouteDrawer>
  )
}
