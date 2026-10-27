import { useInventoryItem, useUpdateInventoryItem } from "@hooks/api";
import { MetadataForm } from "@components/forms/metadata-form";
import { RouteDrawer } from "@components/modals";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const InventoryItemMetadata = () => {
  const id = useRequiredParam("id");

  const { inventory_item, isPending, isError, error } = useInventoryItem(id);
  const { mutateAsync, isPending: isMutating } = useUpdateInventoryItem(id);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer data-testid="inventory-metadata-drawer">
      <MetadataForm
        isPending={isPending}
        isMutating={isMutating}
        hook={mutateAsync}
        metadata={inventory_item?.metadata}
      />
    </RouteDrawer>
  );
};
