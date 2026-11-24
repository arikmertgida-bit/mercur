import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteDrawer } from "../../../components/modals"
import { useProduct } from "../../../hooks/api/products"
import { PRODUCT_DETAIL_QUERY } from "../constants"
import { ProductSellerForm } from "./components/product-seller-form"

export const ProductSeller = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const { product, isLoading, isError, error } = useProduct(
    id,
    PRODUCT_DETAIL_QUERY
  )

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer data-testid="product-seller-drawer">
      <RouteDrawer.Header data-testid="product-seller-drawer-header">
        <RouteDrawer.Title asChild data-testid="product-seller-drawer-title">
          <Heading data-testid="product-seller-drawer-title-text">
            {t("products.sellerChange.header")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("products.sellerChange.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isLoading && product && <ProductSellerForm product={product} />}
    </RouteDrawer>
  )
}
