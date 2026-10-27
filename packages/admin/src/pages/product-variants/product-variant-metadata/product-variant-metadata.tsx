import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useProductVariant, useUpdateProductVariant } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const ProductVariantMetadata = () => {
  const id = useRequiredParam("id")
  const variant_id = useRequiredParam("variant_id")

  const { variant, isPending, isError, error } = useProductVariant(
    id,
    variant_id
  )

  const { mutateAsync, isPending: isMutating } = useUpdateProductVariant(
    id,
    variant_id
  )

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={variant?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
