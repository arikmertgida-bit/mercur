import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteDrawer } from "../../../components/modals"
import { usePromotion } from "../../../hooks/api/promotions"
import { PROMOTION_DETAIL_BASE_FIELDS } from "../promotion-detail/loader"
import { AddCampaignPromotionForm } from "./components/add-campaign-promotion-form"

export const PromotionAddCampaign = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()
  const linkQuery = useLinkQuery("promotion", PROMOTION_DETAIL_BASE_FIELDS)
  const { promotion, isPending, isError, error } = usePromotion(id, linkQuery)

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("promotions.campaign.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {!isPending && promotion && (
        <AddCampaignPromotionForm promotion={promotion} />
      )}
    </RouteDrawer>
  )
}
