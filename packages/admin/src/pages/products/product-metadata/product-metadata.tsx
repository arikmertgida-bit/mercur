import { MetadataForm } from "@components/forms/metadata-form/metadata-form"
import { useProduct, useUpdateProduct } from "@hooks/api"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { PRODUCT_DETAIL_QUERY } from "../constants"

export const ProductMetadata = () => {
  const id = useRequiredParam("id")

  const { product, isPending, isError, error } = useProduct(id, PRODUCT_DETAIL_QUERY)
  const { mutateAsync, isPending: isMutating } = useUpdateProduct(id)

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={product?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
