import { RouteFocusModal } from "../../../components/modals"
import { AddCustomersForm } from "./components/add-customers-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CustomerGroupAddCustomers = () => {
  const id = useRequiredParam("id")

  return (
    <RouteFocusModal>
      <AddCustomersForm customerGroupId={id} />
    </RouteFocusModal>
  )
}
