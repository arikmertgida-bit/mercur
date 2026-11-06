import { useTranslation } from "react-i18next"

import { RouteFocusModal } from "../../../components/modals"
import { CreateCampaignForm } from "./components/create-campaign-form"

export const CampaignCreate = () => {
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
