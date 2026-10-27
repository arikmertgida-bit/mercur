import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/variants/create
import { RouteFocusModal } from "@components/modals"
import { useProduct } from "@hooks/api/products"
import { PRODUCT_DETAIL_QUERY } from "../../../common/constants"
import { CreateProductVariantForm } from "./create-product-variant-form"

export const Component = () => {
  const id = useRequiredParam("id")

  const { product, isLoading, isError, error } = useProduct(
    id,
    PRODUCT_DETAIL_QUERY
  )

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {!isLoading && product && <CreateProductVariantForm product={product} />}
    </RouteFocusModal>
  )
}
