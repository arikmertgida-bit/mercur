import { RouteFocusModal } from "../../../components/modals"
import { TaxRegionCreateForm } from "./components/tax-region-create-form"
import { useTranslation } from "react-i18next"

export const TaxRegionCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal data-testid="tax-region-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("taxRegions.create.header")}</span>
      </RouteFocusModal.Title>
      <TaxRegionCreateForm />
    </RouteFocusModal>
  )
}
