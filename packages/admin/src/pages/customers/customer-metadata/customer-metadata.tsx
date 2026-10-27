import { MetadataForm } from "@components/forms/metadata-form"
import { useCustomer, useUpdateCustomer } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CustomerMetadata = () => {
  const id = useRequiredParam("id")

  const { customer, isPending, isError, error } = useCustomer(id)
  const { mutateAsync, isPending: isMutating } = useUpdateCustomer(id)

  if (isError) {
    throw error
  }

  return (
    <div data-testid="customer-metadata">
      <MetadataForm
        metadata={customer?.metadata}
        hook={mutateAsync}
        isPending={isPending}
        isMutating={isMutating}
      />
    </div>
  )
}
