// Route: /price-lists/:id/products/add
import { useTranslation } from "react-i18next"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteFocusModal } from "@components/modals"
import { usePriceList } from "@hooks/api/price-lists"
import { usePriceListCurrencyData } from "../../../common/hooks/use-price-list-currency-data"
import { PriceListPricesAddForm } from "./price-list-prices-add-form"

export const Component = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { price_list, isPending, isError, error } = usePriceList(id)
  const currencyData = usePriceListCurrencyData()

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("priceLists.products.add.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description className="sr-only">
        {t("priceLists.products.add.description")}
      </RouteFocusModal.Description>
      {currencyData.isReady && !isPending && price_list && (
        <PriceListPricesAddForm priceList={price_list} {...currencyData} />
      )}
    </RouteFocusModal>
  )
}
