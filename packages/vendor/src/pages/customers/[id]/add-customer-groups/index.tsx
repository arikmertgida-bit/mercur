import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /customers/:id/add-customer-groups
import { RouteFocusModal } from "@components/modals"
import { AddCustomerGroupsForm } from "./add-customers-form"

export const Component = () => {
  const id = useRequiredParam("id")
  return (
    <RouteFocusModal>
      <AddCustomerGroupsForm customerId={id} />
    </RouteFocusModal>
  )
}
