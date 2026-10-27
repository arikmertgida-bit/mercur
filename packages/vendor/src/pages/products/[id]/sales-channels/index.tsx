import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/sales-channels

import { RouteFocusModal } from "@components/modals"
import { useProduct } from "@hooks/api/products"
import { EditSalesChannelsForm } from "./edit-sales-channels-form"

export const Component = () => {
  const id = useRequiredParam("id")
  const { product, isLoading, isError, error } = useProduct(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {!isLoading && product && <EditSalesChannelsForm product={product} />}
    </RouteFocusModal>
  )
}
