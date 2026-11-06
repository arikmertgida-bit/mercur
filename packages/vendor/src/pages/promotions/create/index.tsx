// Route: /promotions/create
import { RouteFocusModal } from "@components/modals"
import { useTranslation } from "react-i18next"
import { CreatePromotionForm } from "./create-promotion-form/create-promotion-form"

export const Component = () => {
  const { t } = useTranslation()

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("promotions.createPromotionTitle")}</span>
      </RouteFocusModal.Title>
      <CreatePromotionForm />
    </RouteFocusModal>
  )
}
