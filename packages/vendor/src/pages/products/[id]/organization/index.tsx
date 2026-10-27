import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/organization
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { RouteDrawer } from "@components/modals"
import { useProduct } from "@hooks/api/products"
import { ProductOrganizationForm } from "./product-organization-form"

export const Component = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const { product, isLoading, isError, error } = useProduct(id, {
    fields: "*categories",
  })

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.organization.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && product && <ProductOrganizationForm product={product} />}
    </RouteDrawer>
  )
}
