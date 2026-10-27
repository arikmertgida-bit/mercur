import { MetadataForm } from "@components/forms/metadata-form";
import { RouteDrawer } from "@components/modals";
import { useUpdateUser, useUser } from "@hooks/api";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const UserMetadata = () => {
  const id = useRequiredParam("id");

  const { user, isPending, isError, error } = useUser(id);
  const { mutateAsync, isPending: isMutating } = useUpdateUser(id);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer data-testid="user-metadata-drawer">
      <MetadataForm
        isPending={isPending}
        isMutating={isMutating}
        hook={mutateAsync}
        metadata={user?.metadata}
      />
    </RouteDrawer>
  );
};
