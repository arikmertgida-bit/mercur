
import { RouteFocusModal } from "../../../components/modals"
import { useCollection } from "../../../hooks/api/collections"
import { AddProductsToCollectionForm } from "./components/add-products-to-collection-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const CollectionAddProducts = () => {
  const id = useRequiredParam("id")
  const { collection, isLoading, isError, error } = useCollection(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {!isLoading && collection && (
        <AddProductsToCollectionForm collection={collection} />
      )}
    </RouteFocusModal>
  )
}
