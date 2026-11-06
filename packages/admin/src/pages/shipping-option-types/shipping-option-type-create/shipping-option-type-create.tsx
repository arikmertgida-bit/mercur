import { RouteFocusModal } from "../../../components/modals"
import { CreateShippingOptionTypeForm } from "./components/create-shipping-option-type-form"
import { useTranslation } from "react-i18next"

export const ShippingOptionTypeCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal data-testid="shipping-option-type-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("shippingOptionTypes.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateShippingOptionTypeForm />
    </RouteFocusModal>
  )
}
