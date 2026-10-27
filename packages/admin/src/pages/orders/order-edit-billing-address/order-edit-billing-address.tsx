import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { RouteDrawer } from "../../../components/modals"
import { useOrder } from "../../../hooks/api"
import { DEFAULT_FIELDS } from "../order-detail/constants"
import { EditOrderBillingAddressForm } from "./components/edit-order-billing-address-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const OrderEditBillingAddress = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { order, isPending, isError, error } = useOrder(id, {
    fields: DEFAULT_FIELDS,
  })

  if (!isPending && isError) {
    throw error
  }

  return (
    <RouteDrawer data-testid="order-edit-billing-address-drawer">
      <RouteDrawer.Header data-testid="order-edit-billing-address-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="order-edit-billing-address-heading">{t("orders.edit.billingAddress.title")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {order && <EditOrderBillingAddressForm order={order} />}
    </RouteDrawer>
  )
}
