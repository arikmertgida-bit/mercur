import { Children, ReactNode } from "react"
import { RouteFocusModal } from "../../../components/modals"
import { TabbedForm } from "../../../components/tabbed-form/tabbed-form"
import { useProduct } from "../../../hooks/api/products"
import { PRODUCT_DETAIL_QUERY } from "../constants"
import {
  CreateProductVariantForm,
  CreateProductVariantSchemaType,
} from "./components/create-product-variant-form"
import { CreateProductVariantSchema } from "./components/create-product-variant-form/constants"
import DetailsTab from "./components/create-product-variant-form/details-tab"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

const Root = ({ children }: { children?: ReactNode }) => {
  const id = useRequiredParam("id")

  const { product, isLoading, isError, error } = useProduct(id, PRODUCT_DETAIL_QUERY)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal prev="../..">
      {!isLoading && product && (
        Children.count(children) > 0 ? (
          children
        ) : (
          <CreateProductVariantForm product={product} />
        )
      )}
    </RouteFocusModal>
  )
}

export const ProductCreateVariantPage = Object.assign(Root, {
  Form: CreateProductVariantForm,
  DetailsTab,
  Tab: TabbedForm.Tab,
})

export type { CreateProductVariantSchemaType }
export { CreateProductVariantSchema }

// Keep backward-compatible named export for route `Component`
export const ProductCreateVariant = Root
