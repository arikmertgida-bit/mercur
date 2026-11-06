import { useTaxRegion, useUpdateTaxRegion } from "@hooks/api"
import { MetadataForm } from "@components/forms/metadata-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const TaxRegionMetadata = () => {
  const id = useRequiredParam("id")

  const { tax_region, isPending, isError, error } = useTaxRegion(id)
  const { mutateAsync, isPending: isMutating } = useUpdateTaxRegion(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      isPending={isPending}
      isMutating={isMutating}
      hook={mutateAsync}
      metadata={tax_region?.metadata}
    />
  )
}
