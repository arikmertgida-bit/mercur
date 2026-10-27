
import { RouteFocusModal } from "../../../components/modals"
import { useProduct } from "../../../hooks/api/products"
import { PRODUCT_DETAIL_QUERY } from "../constants"
import { EditSalesChannelsForm } from "./components/edit-sales-channels-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const ProductSalesChannels = () => {
  const id = useRequiredParam("id")
  const { product, isLoading, isError, error } = useProduct(id, PRODUCT_DETAIL_QUERY)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="product-sales-channels-modal">
      {!isLoading && product && <EditSalesChannelsForm product={product} />}
    </RouteFocusModal>
  )
}
