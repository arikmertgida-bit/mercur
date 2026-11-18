import { useTranslation } from "react-i18next"

import { RouteFocusModal } from "@components/modals"
import { CreateShippingProfileForm } from "./_components/create-shipping-profile-form"

const ShippingProfileCreate = () => {
  const { t } = useTranslation()

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("shippingProfile.create.header")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("shippingProfile.create.hint")}</span>
      </RouteFocusModal.Description>
      <CreateShippingProfileForm />
    </RouteFocusModal>
  )
}

export const Component = ShippingProfileCreate
