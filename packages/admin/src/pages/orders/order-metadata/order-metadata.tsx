import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useOrder, useUpdateOrder } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const OrderMetadata = () => {
  const id = useRequiredParam("id")

  const { order, isPending, isError, error } = useOrder(id, {
    fields: "id,metadata",
  })

  const { mutateAsync, isPending: isMutating } = useUpdateOrder(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={order?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
