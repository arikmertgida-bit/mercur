import { RouteFocusModal } from "../../../components/modals"
import { AddCustomerGroupsForm } from "./components/add-customers-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CustomerAddCustomerGroups = () => {
  const id = useRequiredParam("id")

  return (
    <RouteFocusModal>
      <AddCustomerGroupsForm customerId={id} />
    </RouteFocusModal>
  )
}
