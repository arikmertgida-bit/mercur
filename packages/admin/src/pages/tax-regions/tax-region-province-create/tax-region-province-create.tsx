import { RouteFocusModal } from "../../../components/modals"
import { useTaxRegion } from "../../../hooks/api/tax-regions"
import { TaxRegionProvinceCreateForm } from "./components/tax-region-province-create-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const TaxProvinceCreate = () => {
  const id = useRequiredParam("id")

  const { tax_region, isPending, isError, error } = useTaxRegion(id)

  const countryCode = tax_region?.country_code

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="tax-region-province-create-modal">
      {!isPending && tax_region && countryCode && (
        <TaxRegionProvinceCreateForm
          parent={tax_region}
          countryCode={countryCode}
        />
      )}
    </RouteFocusModal>
  )
}
