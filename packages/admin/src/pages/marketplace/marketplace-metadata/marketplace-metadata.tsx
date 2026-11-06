import { MetadataForm } from "@components/forms/metadata-form"
import { useStore, useUpdateStore } from "@hooks/api"

export const MarketplaceMetadata = () => {
  const { store, isPending, isError, error } = useStore()

  const { mutateAsync, isPending: isMutating } = useUpdateStore(store?.id ?? '')

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      isPending={isPending}
      isMutating={isMutating}
      hook={mutateAsync}
      metadata={store?.metadata}
    />
  )
}
