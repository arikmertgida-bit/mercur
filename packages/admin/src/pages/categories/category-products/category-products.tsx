import { RouteFocusModal } from "../../../components/modals"
import { useProductCategory } from "../../../hooks/api/categories"
import { EditCategoryProductsForm } from "./components/edit-category-products-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const CategoryProducts = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { product_category, isPending, isFetching, isError, error } =
    useProductCategory(id, {
      fields: "products.id",
    })

  const ready = !isPending && !isFetching && !!product_category

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.domain")}</span>
      </RouteFocusModal.Title>
      {ready && (
        <EditCategoryProductsForm
          categoryId={product_category.id}
          products={product_category.products}
        />
      )}
    </RouteFocusModal>
  )
}
