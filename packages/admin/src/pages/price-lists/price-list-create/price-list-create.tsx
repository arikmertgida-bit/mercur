import { Children, ReactNode } from "react"

import { RouteFocusModal } from "../../../components/modals"
import { TabbedForm } from "../../../components/tabbed-form/tabbed-form"
import { usePriceListCurrencyData } from "../common/hooks/use-price-list-currency-data"
import { PriceListCreateForm } from "./components/price-list-create-form"
import { PriceListDetailsForm } from "./components/price-list-create-form/price-list-details-form"
import { PriceListProductsForm } from "./components/price-list-create-form/price-list-products-form"
import { PriceListPricesForm } from "./components/price-list-create-form/price-list-prices-form"
import { PricingCreateSchema, PricingCreateSchemaType } from "./components/price-list-create-form/schema"
import { useTranslation } from "react-i18next"

const Root = ({ children }: { children?: ReactNode }) => {
  const { t } = useTranslation()
  const { isReady, regions, currencies, pricePreferences } =
    usePriceListCurrencyData()

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("priceLists.create.header")}</span>
      </RouteFocusModal.Title>
      {isReady && (
        Children.count(children) > 0 ? (
          children
        ) : (
          <PriceListCreateForm
            regions={regions}
            currencies={currencies}
            pricePreferences={pricePreferences}
          />
        )
      )}
    </RouteFocusModal>
  )
}

export const PriceListCreatePage = Object.assign(Root, {
  Form: PriceListCreateForm,
  DetailsTab: PriceListDetailsForm,
  ProductsTab: PriceListProductsForm,
  PricesTab: PriceListPricesForm,
  Tab: TabbedForm.Tab,
})

export type { PricingCreateSchemaType }
export { PricingCreateSchema }

// Keep backward-compatible named export for route `Component`
export const PriceListCreate = Root
