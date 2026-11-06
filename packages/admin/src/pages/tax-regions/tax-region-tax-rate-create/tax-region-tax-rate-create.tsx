import { useParams } from "react-router-dom"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteFocusModal } from "../../../components/modals"
import { useTaxRegion } from "../../../hooks/api/tax-regions"
import { TaxRegionTaxRateCreateForm } from "./components/tax-region-tax-rate-create-form"
import { useTranslation } from "react-i18next"

export const TaxRegionTaxRateCreate = () => {
  const { t } = useTranslation()
  const { province_id } = useParams()
  const id = useRequiredParam("id")

  const { tax_region, isPending, isError, error } = useTaxRegion(
    province_id || id
  )

  const ready = !isPending && !!tax_region

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("taxRegions.taxRates.create.header")}</span>
      </RouteFocusModal.Title>
      {ready && (
        <TaxRegionTaxRateCreateForm
          taxRegion={tax_region}
          isSublevel={!!province_id}
        />
      )}
    </RouteFocusModal>
  )
}
