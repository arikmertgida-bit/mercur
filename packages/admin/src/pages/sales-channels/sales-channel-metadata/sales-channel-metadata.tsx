import { MetadataForm } from "@components/forms/metadata-form";
import { useSalesChannel, useUpdateSalesChannel } from "@hooks/api";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const SalesChannelMetadata = () => {
  const id = useRequiredParam("id");

  const {
    sales_channel: salesChannel,
    isPending,
    isError,
    error,
  } = useSalesChannel(id);
  const { mutateAsync, isPending: isMutating } = useUpdateSalesChannel(id);

  if (isError) {
    throw error;
  }

  return (
    <MetadataForm
      isPending={isPending}
      isMutating={isMutating}
      hook={mutateAsync}
      metadata={salesChannel?.metadata}
    />
  );
};
