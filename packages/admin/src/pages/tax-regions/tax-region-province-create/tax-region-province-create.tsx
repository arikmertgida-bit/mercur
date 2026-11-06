import { RouteFocusModal } from "../../../components/modals"
import { useTaxRegion } from "../../../hooks/api/tax-regions"
import { TaxRegionProvinceCreateForm } from "./components/tax-region-province-create-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const TaxProvinceCreate = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { tax_region, isPending, isError, error } = useTaxRegion(id)

  const countryCode = tax_region?.country_code

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="tax-region-province-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("taxRegions.create.header")}</span>
      </RouteFocusModal.Title>
      {!isPending && tax_region && countryCode && (
        <TaxRegionProvinceCreateForm
          parent={tax_region}
          countryCode={countryCode}
        />
      )}
    </RouteFocusModal>
  )
}
