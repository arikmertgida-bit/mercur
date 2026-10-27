import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /collections/:id/metadata
import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useCollection, useUpdateCollection } from "@hooks/api"

export const Component = () => {
  const id = useRequiredParam("id")
  const { product_collection, isPending, isError, error } = useCollection(id)
  const { mutateAsync, isPending: isMutating } = useUpdateCollection(product_collection?.id)

  if (isError) throw error

  return (
    <MetadataForm
      metadata={product_collection?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
