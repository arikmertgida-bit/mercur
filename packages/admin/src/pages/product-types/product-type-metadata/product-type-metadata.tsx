import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useProductType, useUpdateProductType } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const ProductTypeMetadata = () => {
  const id = useRequiredParam("id")

  const { product_type, isPending, isError, error } = useProductType(id)
  const { mutateAsync, isPending: isMutating } = useUpdateProductType(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={product_type?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
