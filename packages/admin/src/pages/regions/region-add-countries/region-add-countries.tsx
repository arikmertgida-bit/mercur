import { RouteFocusModal } from "../../../components/modals"
import { useRegion } from "../../../hooks/api/regions"
import { AddCountriesForm } from "./components/add-countries-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const RegionAddCountries = () => {
  const id = useRequiredParam("id")

  const {
    region,
    isPending: isLoading,
    isError,
    error,
  } = useRegion(id, {
    fields: "*payment_providers",
  })

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="region-add-countries-modal">
      {!isLoading && region && <AddCountriesForm region={region} />}
    </RouteFocusModal>
  )
}
