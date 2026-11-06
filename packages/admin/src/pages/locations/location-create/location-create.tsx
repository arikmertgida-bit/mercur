import { RouteFocusModal } from "../../../components/modals"
import { CreateLocationForm } from "./components/create-location-form"
import { useTranslation } from "react-i18next"

export const LocationCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal data-testid="location-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("stockLocations.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateLocationForm />
    </RouteFocusModal>
  )
}
