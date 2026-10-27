import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteDrawer } from "../../../components/modals"
import { useCustomer } from "../../../hooks/api/customers"
import { EditCustomerForm } from "./components/edit-customer-form"

export const CustomerEdit = () => {
  const { t } = useTranslation()

  const id = useRequiredParam("id")
  const { customer, isLoading, isError, error } = useCustomer(
    id,
    useLinkQuery("customer")
  )

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("customers.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && customer && <EditCustomerForm customer={customer} />}
    </RouteDrawer>
  )
}
