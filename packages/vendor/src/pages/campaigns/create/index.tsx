// Route: /campaigns/create
import { RouteFocusModal } from "@components/modals"
import { useTranslation } from "react-i18next"
import { CreateCampaignForm } from "./create-campaign-form"

export const Component = () => {
  const { t } = useTranslation()

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("campaigns.create.title")}</span>
      </RouteFocusModal.Title>
      <CreateCampaignForm />
    </RouteFocusModal>
  )
}
