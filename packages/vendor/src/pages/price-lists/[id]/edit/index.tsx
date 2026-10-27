// Route: /price-lists/:id/edit
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteDrawer } from "@components/modals"
import { usePriceList } from "@hooks/api/price-lists"
import { PriceListEditForm } from "./price-list-edit-form"

export const Component = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const linkQuery = useLinkQuery("price_list")
  const { price_list, isLoading, isError, error } = usePriceList(id, linkQuery)

  const ready = !isLoading && price_list

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("priceLists.edit.header")}</Heading>
      </RouteDrawer.Header>
      {ready && <PriceListEditForm priceList={price_list} />}
    </RouteDrawer>
  )
}
