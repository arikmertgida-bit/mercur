import { RouteFocusModal } from "../../../components/modals"
import { useCampaign } from "../../../hooks/api/campaigns"
import { AddCampaignPromotionsForm } from "./components"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const AddCampaignPromotions = () => {
  const id = useRequiredParam("id")
  const { campaign, isError, error } = useCampaign(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {campaign && <AddCampaignPromotionsForm campaign={campaign} />}
    </RouteFocusModal>
  )
}
