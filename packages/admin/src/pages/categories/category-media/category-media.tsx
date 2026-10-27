import { useTranslation } from "react-i18next"

import { RouteFocusModal } from "../../../components/modals"
import { useProductCategory } from "../../../hooks/api/categories"
import { CategoryMediaView } from "./components/category-media-view"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CategoryMedia = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { product_category, isLoading, isError, error } = useProductCategory(
    id
  )

  const ready = !isLoading && !!product_category

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="category-media-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("categories.media.label")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("categories.media.edit.description")}</span>
      </RouteFocusModal.Description>
      {ready && <CategoryMediaView category={product_category} />}
    </RouteFocusModal>
  )
}
