// Route: /products/:id/variants/:variant_id/media
import { useTranslation } from "react-i18next"

import { RouteFocusModal } from "@components/modals"
import { useProductVariant } from "@hooks/api/products"
import { useVariantRouteParams } from "../../common/route-params"

import { VARIANT_DETAIL_FIELDS } from "../loader"
import { EditVariantMediaForm } from "./edit-variant-media-form"

export const Component = () => {
  const { t } = useTranslation()
  const { productId, variantId } = useVariantRouteParams()

  const { variant, isLoading, isError, error } = useProductVariant(
    productId,
    variantId,
    { fields: VARIANT_DETAIL_FIELDS }
  )

  if (isError) {
    throw error
  }

  const ready = !isLoading && !!variant

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.media.label")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("products.media.editHint")}</span>
      </RouteFocusModal.Description>
      {ready && <EditVariantMediaForm variant={variant} />}
    </RouteFocusModal>
  )
}
