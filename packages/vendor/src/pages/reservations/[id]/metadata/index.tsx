import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /reservations/:id/metadata
import { useReservationItem, useUpdateReservationItem } from "@hooks/api"
import { MetadataForm } from "@components/forms/metadata-form"

export const Component = () => {
  const id = useRequiredParam("id")

  const { reservation, isPending, isError, error } = useReservationItem(id)
  const { mutateAsync, isPending: isMutating } = useUpdateReservationItem(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      isPending={isPending}
      isMutating={isMutating}
      hook={mutateAsync}
      metadata={reservation?.metadata}
    />
  )
}
