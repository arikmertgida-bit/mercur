import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useLoaderData } from "react-router-dom"

import { RouteDrawer } from "@components/modals"
import { useProduct, useProductVariant } from "@hooks/api/products"
import { useVariantRouteParams } from "../common/route-params"
import { ProductEditVariantForm } from "./components/product-edit-variant-form"
import { editProductVariantLoader } from "./loader"

export const ProductVariantEdit = () => {
  const initialData = useLoaderData<typeof editProductVariantLoader>()

  const { t } = useTranslation()
  const { productId, variantId } = useVariantRouteParams()

  const { variant, isPending, isError, error } = useProductVariant(
    productId,
    variantId,
    {
      fields:
        "+options.id,+options.value,+options.option.id,+options.option.title,+prices.id,+prices.amount,+prices.currency_code",
    },
    {
      initialData,
    },
  )

  const {
    product,
    isPending: isProductPending,
    isError: isProductError,
    error: productError,
  } = useProduct(
    variant?.product_id ?? "",
    {
      fields: "-variants",
    },
    {
      enabled: !!variant?.product_id,
    },
  )

  const ready = !isPending && !!variant && !isProductPending && !!product

  if (isError) {
    throw error
  }

  if (isProductError) {
    throw productError
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.variant.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {ready && <ProductEditVariantForm variant={variant} product={product} />}
    </RouteDrawer>
  )
}
