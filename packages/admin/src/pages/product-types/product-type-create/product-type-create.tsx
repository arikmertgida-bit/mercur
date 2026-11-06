import { RouteFocusModal } from "../../../components/modals"
import { CreateProductTypeForm } from "./components/create-product-type-form"
import { useTranslation } from "react-i18next"

export const ProductTypeCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal data-testid="product-type-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("productTypes.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateProductTypeForm />
    </RouteFocusModal>
  )
}
