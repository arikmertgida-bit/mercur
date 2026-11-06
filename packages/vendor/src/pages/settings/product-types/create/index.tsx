import { RouteFocusModal } from "@components/modals"
import { CreateProductTypeForm } from "./_components/create-product-type-form"
import { useTranslation } from "react-i18next"

const ProductTypeCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("productTypes.create.requestHeader")}</span>
      </RouteFocusModal.Title>
      <CreateProductTypeForm />
    </RouteFocusModal>
  )
}

export const Component = ProductTypeCreate
