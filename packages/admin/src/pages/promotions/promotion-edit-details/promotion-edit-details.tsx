import { Heading } from "@medusajs/ui"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

import { RouteDrawer } from "../../../components/modals"
import { usePromotion } from "../../../hooks/api/promotions"
import { PROMOTION_DETAIL_BASE_FIELDS } from "../promotion-detail/loader"
import { EditPromotionDetailsForm } from "./components/edit-promotion-form"

export const PromotionEditDetails = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const linkQuery = useLinkQuery("promotion", PROMOTION_DETAIL_BASE_FIELDS)
  const { promotion, isLoading, isError, error } = usePromotion(id, linkQuery)

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("promotions.edit.title")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {!isLoading && promotion && (
        <EditPromotionDetailsForm promotion={promotion} />
      )}
    </RouteDrawer>
  )
}
