import { useReservationItem, useUpdateReservationItem } from "@hooks/api";
import { MetadataForm } from "@components/forms/metadata-form";
import { RouteDrawer } from "@components/modals";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const ReservationMetadata = () => {
  const id = useRequiredParam("id");

  const { reservation, isPending, isError, error } = useReservationItem(id);
  const { mutateAsync, isPending: isMutating } = useUpdateReservationItem(id);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <MetadataForm
        isPending={isPending}
        isMutating={isMutating}
        hook={mutateAsync}
        metadata={reservation?.metadata}
      />
    </RouteDrawer>
  );
};
