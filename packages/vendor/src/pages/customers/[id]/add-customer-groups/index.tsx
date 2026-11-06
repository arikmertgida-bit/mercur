import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /customers/:id/add-customer-groups
import { RouteFocusModal } from "@components/modals"
import { AddCustomerGroupsForm } from "./add-customers-form"
import { useTranslation } from "react-i18next"

export const Component = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("customers.groups.label")}</span>
      </RouteFocusModal.Title>
      <AddCustomerGroupsForm customerId={id} />
    </RouteFocusModal>
  )
}
