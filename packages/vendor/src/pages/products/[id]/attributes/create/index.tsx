// Route: /products/:id/attributes/create
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteDrawer } from "@components/modals"
import { CreateAttributeForm } from "./components/create-attribute-form"

export const Component = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.addAttribute")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      <CreateAttributeForm productId={id} />
    </RouteDrawer>
  )
}
