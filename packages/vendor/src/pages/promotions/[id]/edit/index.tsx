// Route: /promotions/:id/edit
import { Heading } from "@medusajs/ui"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "@components/modals"
import { usePromotion } from "@hooks/api/promotions"
import { EditPromotionDetailsForm } from "./edit-promotion-form"

export const Component = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()
  const linkQuery = useLinkQuery("promotion")
  const { promotion, isLoading, isError, error } = usePromotion(id, linkQuery)

  if (isError) throw error

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("promotions.edit.title")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && promotion && <EditPromotionDetailsForm promotion={promotion} />}
    </RouteDrawer>
  )
}
