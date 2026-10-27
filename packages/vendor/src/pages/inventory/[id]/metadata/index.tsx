import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /inventory/:id/metadata
import { useInventoryItem, useUpdateInventoryItem } from "@hooks/api"
import { MetadataForm } from "@components/forms/metadata-form"
import { RouteDrawer } from "@components/modals"
import type { ClientError } from "@mercurjs/client"
import type { JsonRecord } from "@mercurjs/types"

export const Component = () => {
  const id = useRequiredParam("id")
  const { inventory_item, isPending, isError, error } = useInventoryItem(id)
  const { mutateAsync, isPending: isMutating } = useUpdateInventoryItem(id)

  if (isError) throw error

  const handleUpdate = async (
    params: { metadata?: JsonRecord | null },
    callbacks: { onSuccess: () => void; onError: (error: ClientError) => void }
  ) => {
    return mutateAsync({ metadata: params.metadata ?? undefined }, callbacks)
  }

  return (
    <RouteDrawer>
      <MetadataForm
        isPending={isPending}
        isMutating={isMutating}
        hook={handleUpdate}
        metadata={inventory_item?.metadata}
      />
    </RouteDrawer>
  )
}
