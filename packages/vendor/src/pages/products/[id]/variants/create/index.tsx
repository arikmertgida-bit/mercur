import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"
// Route: /products/:id/variants/create
import { RouteFocusModal } from "@components/modals"
import { useRegions, useStockLocations } from "@hooks/api"
import { useProduct } from "@hooks/api/products"
import { PRODUCT_DETAIL_QUERY } from "../../../common/constants"
import { CreateProductVariantForm } from "./create-product-variant-form"

export const Component = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { product, isLoading, isError, error } = useProduct(
    id,
    PRODUCT_DETAIL_QUERY
  )
  // Same sources as the product-create variants grid: one price per
  // marketplace currency, stock in the seller's own locations.
  const {
    regions,
    isPending: isRegionsPending,
    isError: isRegionsError,
    error: regionsError,
  } = useRegions({ limit: 9999 })
  const {
    stock_locations,
    isPending: isLocationsPending,
    isError: isLocationsError,
    error: locationsError,
  } = useStockLocations({ limit: 100 })

  if (isError) {
    throw error
  }
  if (isRegionsError) {
    throw regionsError
  }
  if (isLocationsError) {
    throw locationsError
  }

  const ready =
    !isLoading && !!product && !isRegionsPending && !isLocationsPending

  return (
    <RouteFocusModal>
      {!ready && (
        <>
          <RouteFocusModal.Title asChild>
            <span className="sr-only">{t("products.variant.create.header")}</span>
          </RouteFocusModal.Title>
          <RouteFocusModal.Description className="sr-only">
            {t("products.variant.create.header")}
          </RouteFocusModal.Description>
        </>
      )}
      {ready && (
        <CreateProductVariantForm
          product={product}
          currencies={Array.from(
            new Set((regions ?? []).map((region) => region.currency_code))
          )}
          stockLocations={(stock_locations ?? []).map((location) => ({
            id: location.id,
            name: location.name,
          }))}
        />
      )}
    </RouteFocusModal>
  )
}
