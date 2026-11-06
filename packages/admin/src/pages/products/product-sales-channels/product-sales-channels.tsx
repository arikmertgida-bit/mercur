
import { RouteFocusModal } from "../../../components/modals"
import { useProduct } from "../../../hooks/api/products"
import { PRODUCT_DETAIL_QUERY } from "../constants"
import { EditSalesChannelsForm } from "./components/edit-sales-channels-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const ProductSalesChannels = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  const { product, isLoading, isError, error } = useProduct(id, PRODUCT_DETAIL_QUERY)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="product-sales-channels-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.fields.sales_channels.label")}</span>
      </RouteFocusModal.Title>
      {!isLoading && product && <EditSalesChannelsForm product={product} />}
    </RouteFocusModal>
  )
}
