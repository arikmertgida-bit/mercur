import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/sales-channels

import { RouteFocusModal } from "@components/modals"
import { useProduct } from "@hooks/api/products"
import { EditSalesChannelsForm } from "./edit-sales-channels-form"
import { useTranslation } from "react-i18next"

export const Component = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  const { product, isLoading, isError, error } = useProduct(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.fields.sales_channels.label")}</span>
      </RouteFocusModal.Title>
      {!isLoading && product && <EditSalesChannelsForm product={product} />}
    </RouteFocusModal>
  )
}
