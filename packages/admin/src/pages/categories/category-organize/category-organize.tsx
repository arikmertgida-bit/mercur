import { RouteFocusModal } from "../../../components/modals"
import { OrganizeCategoryForm } from "./components/organize-category-form/organize-category-form"
import { useTranslation } from "react-i18next"

export const CategoryOrganize = () => {
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
