import { RouteFocusModal } from "../../../components/modals"
import { useCampaign } from "../../../hooks/api/campaigns"
import { AddCampaignPromotionsForm } from "./components"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const AddCampaignPromotions = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  const { campaign, isError, error } = useCampaign(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("promotions.domain")}</span>
      </RouteFocusModal.Title>
      {campaign && <AddCampaignPromotionsForm campaign={campaign} />}
    </RouteFocusModal>
  )
}
