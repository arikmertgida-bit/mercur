import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/metadata
import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useProduct, useUpdateProduct } from "@hooks/api"

export const Component = () => {
  const id = useRequiredParam("id")

  const { product, isPending, isError, error } = useProduct(id)

  const { mutateAsync, isPending: isMutating } = useUpdateProduct(
    product?.id || id
  )

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={product?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
