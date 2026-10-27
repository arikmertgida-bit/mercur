import { useParams } from "react-router-dom"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteFocusModal } from "../../../components/modals"
import { useTaxRegion } from "../../../hooks/api/tax-regions"
import { TaxRegionCreateTaxOverrideForm } from "./components/tax-region-override-create-form"

export const TaxRegionCreateTaxOverride = () => {
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
    <RouteFocusModal data-testid="tax-region-override-create-modal">
      {ready && <TaxRegionCreateTaxOverrideForm taxRegion={tax_region} />}
    </RouteFocusModal>
  )
}
