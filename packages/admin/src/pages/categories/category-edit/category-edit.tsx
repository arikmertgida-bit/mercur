import { Heading } from "@medusajs/ui"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"

import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { useProductCategory } from "../../../hooks/api/categories"
import { EditCategoryForm } from "./components/edit-category-form"

export const CategoryEdit = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const linkQuery = useLinkQuery("category")

  const { product_category, isPending, isError, error } = useProductCategory(
    id,
    linkQuery
  )

  const ready = !isPending && !!product_category

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("categories.edit.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("categories.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {ready && <EditCategoryForm category={product_category} />}
    </RouteDrawer>
  )
}
