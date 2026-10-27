import {
  useProductCategory,
  useUpdateProductCategory,
} from "@hooks/api"
import { MetadataForm } from "@components/forms/metadata-form"
import { RouteDrawer } from "@components/modals"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CategoriesMetadata = () => {
  const id = useRequiredParam("id")

  const { product_category, isPending, isError, error } = useProductCategory(id)
  const { mutateAsync, isPending: isMutating } = useUpdateProductCategory(id)

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <MetadataForm
        isPending={isPending}
        isMutating={isMutating}
        hook={mutateAsync}
        metadata={product_category?.metadata}
      />
    </RouteDrawer>
  )
}
