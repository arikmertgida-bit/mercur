// Route: /categories/organize
import { RouteFocusModal } from "@components/modals"
import { OrganizeCategoryForm } from "../[id]/organize/organize-category-form"
import { useTranslation } from "react-i18next"

export const Component = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("categories.organize.action")}</span>
      </RouteFocusModal.Title>
      <OrganizeCategoryForm />
    </RouteFocusModal>
  )
}
