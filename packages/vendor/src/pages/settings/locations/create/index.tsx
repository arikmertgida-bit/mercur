import { RouteFocusModal } from "@components/modals"
import { CreateLocationForm } from "./_components/create-location-form"
import { useTranslation } from "react-i18next"

const LocationCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("stockLocations.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateLocationForm />
    </RouteFocusModal>
  )
}

export const Component = LocationCreate
