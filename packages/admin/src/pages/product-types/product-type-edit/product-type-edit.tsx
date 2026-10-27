import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { useProductType } from "../../../hooks/api/product-types"
import { EditProductTypeForm } from "./components/edit-product-type-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const ProductTypeEdit = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const { product_type, isPending, isError, error } = useProductType(id)

  const ready = !isPending && !!product_type

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer data-testid="product-type-edit-drawer">
      <RouteDrawer.Header data-testid="product-type-edit-drawer-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="product-type-edit-drawer-heading">{t("productTypes.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {ready && <EditProductTypeForm productType={product_type} />}
    </RouteDrawer>
  )
}
