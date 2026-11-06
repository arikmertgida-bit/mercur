import { Children, ReactNode } from "react"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteFocusModal } from "../../../components/modals"
import { TabbedForm } from "../../../components/tabbed-form/tabbed-form"
import { usePriceList } from "../../../hooks/api"
import { usePriceListCurrencyData } from "../common/hooks/use-price-list-currency-data"
import {
  PriceListPricesAddForm,
  PriceListPricesAddSchemaType,
} from "./components/price-list-prices-add-form"
import { PriceListPricesAddProductIdsForm } from "./components/price-list-prices-add-form/price-list-prices-add-product-ids-form"
import { PriceListPricesAddPricesForm } from "./components/price-list-prices-add-form/price-list-prices-add-prices-form"
import { PriceListPricesAddSchema } from "./components/price-list-prices-add-form/schema"
import { useTranslation } from "react-i18next"

const Root = ({ children }: { children?: ReactNode }) => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { price_list, isPending, isError, error } = usePriceList(id, {
    fields: "*prices",
  })
  const currencyData = usePriceListCurrencyData()

  const ready = currencyData.isReady && !isPending && !!price_list

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal prev="../..">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("priceLists.products.actions.addProducts")}</span>
      </RouteFocusModal.Title>
      {ready && (
        Children.count(children) > 0 ? (
          children
        ) : (
          <PriceListPricesAddForm
            priceList={price_list}
            {...currencyData}
          />
        )
      )}
    </RouteFocusModal>
  )
}

export const PriceListPricesAddPage = Object.assign(Root, {
  Form: PriceListPricesAddForm,
  ProductIdsTab: PriceListPricesAddProductIdsForm,
  PricesTab: PriceListPricesAddPricesForm,
  Tab: TabbedForm.Tab,
})

export type { PriceListPricesAddSchemaType }
export { PriceListPricesAddSchema }

// Keep backward-compatible named export for route `Component`
export const PriceListProductsAdd = Root
