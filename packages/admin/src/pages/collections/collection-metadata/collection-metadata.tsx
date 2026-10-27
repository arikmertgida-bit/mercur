import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useCollection, useUpdateCollection } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CollectionMetadata = () => {
  const id = useRequiredParam("id")

  const { collection, isPending, isError, error } = useCollection(id)
  const { mutateAsync, isPending: isMutating } = useUpdateCollection(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={collection?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
