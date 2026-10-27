import { useCustomerGroup, useUpdateCustomerGroup } from "@hooks/api";
import { MetadataForm } from "@components/forms/metadata-form";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const CustomerGroupMetadata = () => {
  const id = useRequiredParam("id");

  const { customer_group, isPending, isError, error } = useCustomerGroup(id);
  const { mutateAsync, isPending: isMutating } = useUpdateCustomerGroup(id);

  if (isError) {
    throw error;
  }

  return (
    <div data-testid="customer-group-metadata">
      <MetadataForm
        metadata={customer_group?.metadata}
        hook={mutateAsync}
        isPending={isPending}
        isMutating={isMutating}
      />
    </div>
  );
};
