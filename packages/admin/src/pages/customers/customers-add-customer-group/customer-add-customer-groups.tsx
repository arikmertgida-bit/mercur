import { RouteFocusModal } from "../../../components/modals"
import { AddCustomerGroupsForm } from "./components/add-customers-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const CustomerAddCustomerGroups = () => {
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
