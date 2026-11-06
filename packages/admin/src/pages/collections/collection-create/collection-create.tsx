import { RouteFocusModal } from "../../../components/modals"
import { CreateCollectionForm } from "./components/create-collection-form"
import { useTranslation } from "react-i18next"

export const CollectionCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("collections.createCollection")}</span>
      </RouteFocusModal.Title>
      <CreateCollectionForm />
    </RouteFocusModal>
  )
}
