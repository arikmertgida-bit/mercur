import { ReactNode, Children } from "react"
import { useLoaderData } from "react-router-dom"

import { WidgetZone } from "@mercurjs/dashboard-shared"

import { useProductVariant } from "@hooks/api/products"

import { TwoColumnPageSkeleton } from "@components/common/skeleton"
import { SingleColumnPage } from "@components/layout/pages"
import { VariantGeneralSection } from "./components/variant-general-section"
import { VariantMediaSection } from "./components/variant-media-section"
import { VariantStockSection } from "./components/variant-stock-section"
import { useVariantRouteParams } from "../common/route-params"
import { variantLoader, VARIANT_DETAIL_FIELDS } from "./loader"

const Root = ({ children }: { children?: ReactNode }) => {
  const initialData = useLoaderData<typeof variantLoader>()

  const { productId, variantId } = useVariantRouteParams()
  const { variant, isLoading, isError, error } = useProductVariant(
    productId,
    variantId,
    { fields: VARIANT_DETAIL_FIELDS },
    {
      initialData,
    }
  )

  if (isLoading || !variant) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={0} />
  }

  if (isError) {
    throw error
  }

  return (
    <SingleColumnPage data={variant} hasOutlet>
      {Children.count(children) > 0 ? (
        children
      ) : (
        <WidgetZone id="product-variants.detail.main" data={variant}>
          <VariantGeneralSection variant={variant} />
          <VariantStockSection variant={variant} />
          <VariantMediaSection variant={variant} />
        </WidgetZone>
      )}
    </SingleColumnPage>
  )
}

export const ProductVariantDetail = Object.assign(Root, {
  GeneralSection: VariantGeneralSection,
  StockSection: VariantStockSection,
  MediaSection: VariantMediaSection,
})
