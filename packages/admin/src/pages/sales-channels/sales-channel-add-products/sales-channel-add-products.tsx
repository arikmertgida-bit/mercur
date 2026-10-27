import { RouteFocusModal } from "../../../components/modals"
import { useSalesChannel } from "../../../hooks/api/sales-channels"
import { AddProductsToSalesChannelForm } from "./components"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const SalesChannelAddProducts = () => {
  const id = useRequiredParam("id")
  const {
    sales_channel,
    isPending: isLoading,
    isError,
    error,
  } = useSalesChannel(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="sales-channel-add-products-modal">
      {!isLoading && sales_channel && (
        <AddProductsToSalesChannelForm salesChannel={sales_channel} />
      )}
    </RouteFocusModal>
  )
}
