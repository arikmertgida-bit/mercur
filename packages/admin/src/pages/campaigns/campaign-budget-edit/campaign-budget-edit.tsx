import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { useCampaign } from "../../../hooks/api/campaigns"
import { EditCampaignBudgetForm } from "./components/edit-campaign-budget-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CampaignBudgetEdit = () => {
  const { t } = useTranslation()

  const id = useRequiredParam("id")
  const { campaign, isLoading, isError, error } = useCampaign(id)

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("campaigns.budget.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {!isLoading && campaign && <EditCampaignBudgetForm campaign={campaign} />}
    </RouteDrawer>
  )
}
