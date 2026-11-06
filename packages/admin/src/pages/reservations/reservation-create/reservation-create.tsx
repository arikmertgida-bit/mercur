import { useSearchParams } from "react-router-dom"

import { RouteFocusModal } from "../../../components/modals"
import { ReservationCreateForm } from "./components/reservation-create-from"
import { useTranslation } from "react-i18next"

export const ReservationCreate = () => {
  const { t } = useTranslation()
  const [params] = useSearchParams()

  const inventoryItemId = params.get("item_id")

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("inventory.reservation.create")}</span>
      </RouteFocusModal.Title>
      <ReservationCreateForm inventoryItemId={inventoryItemId} />
    </RouteFocusModal>
  )
}
