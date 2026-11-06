import { RouteFocusModal } from "../../../components/modals"
import { CreateShippingProfileForm } from "./components/create-shipping-profile-form"
import { useTranslation } from "react-i18next"

export function ShippingProfileCreate() {
  const { t } = useTranslation()
  return (
    <RouteFocusModal data-testid="shipping-profile-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("shippingProfile.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateShippingProfileForm />
    </RouteFocusModal>
  )
}
