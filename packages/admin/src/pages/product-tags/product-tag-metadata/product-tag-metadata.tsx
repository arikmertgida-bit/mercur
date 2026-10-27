import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useProductTag, useUpdateProductTag } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const ProductTagMetadata = () => {
  const id = useRequiredParam("id")

  const { product_tag, isPending, isError, error } = useProductTag(id)

  const { mutateAsync, isPending: isMutating } = useUpdateProductTag(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={product_tag?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
