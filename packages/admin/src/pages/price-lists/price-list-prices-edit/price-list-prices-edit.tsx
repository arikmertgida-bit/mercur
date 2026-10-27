import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { PriceListPricesEditForm } from "./components/price-list-prices-edit-form"
import { usePriceList, useProducts } from "@hooks/api"
import { RouteFocusModal } from "@components/modals"
import { usePriceListCurrencyData } from "../common/hooks/use-price-list-currency-data"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const PriceListPricesEdit = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  const [searchParams] = useSearchParams()
  const ids = searchParams.get("ids[]")

  const { price_list, isLoading, isError, error } = usePriceList(id, {
    fields: "*prices",
  })
  const productIds = ids?.split(",")

  const {
    products,
    isLoading: isProductsLoading,
    isError: isProductsError,
    error: productError,
  } = useProducts({
    id: productIds,
    limit: productIds?.length || 9999, // Temporary until we support lazy loading in the DataGrid
    price_list_id: [id],
    fields: "title,thumbnail,*variants",
  })

  const currencyData = usePriceListCurrencyData()

  const ready = currencyData.isReady &&
    !isLoading && !!price_list && !isProductsLoading && !!products

  if (isError) {
    throw error
  }

  if (isProductsError) {
    throw productError
  }

  return (
    <RouteFocusModal prev="../..">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">
          {t("priceLists.products.edit.header", {
            title: price_list?.title ?? "",
          })}
        </span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description className="sr-only">
        {t("priceLists.products.edit.description")}
      </RouteFocusModal.Description>
      {ready && (
        <PriceListPricesEditForm
          priceList={price_list}
          products={products}
          {...currencyData}
        />
      )}
    </RouteFocusModal>
  )
}
